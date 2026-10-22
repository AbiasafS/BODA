#!/usr/bin/env python3
"""
Utilidad para gestionar las fotos de la boda en Cloudinary (cloud: otehk3l8).

No guarda credenciales en disco: se leen de variables de entorno.

    export CLOUDINARY_API_KEY=123456789012345
    export CLOUDINARY_API_SECRET=abcdef...

Subcomandos:
    status   Muestra el modo de carpetas y los presets existentes.
    preset   Crea (o actualiza) el preset unsigned 'boda-invitados' que usa upload.html.
    upload   Sube una carpeta de imágenes y genera un manifiesto JSON con las URLs.

Ejemplo:
    python3 scripts/upload_cloudinary.py upload \
        "2026-12-26 GESURI & PABLO (resized)/SAVE THE DATE" \
        --tags boda,save-the-date --context source=save-the-date
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Falta 'requests'. Instálalo con: python3 -m pip install --user requests")

CLOUD = os.environ.get("CLOUD_NAME", "otehk3l8")
KEY = os.environ.get("CLOUDINARY_API_KEY")
SECRET = os.environ.get("CLOUDINARY_API_SECRET")
API = f"https://api.cloudinary.com/v1_1/{CLOUD}"
EXCLUDED_FROM_SIGNATURE = ("file", "cloud_name", "resource_type", "api_key")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def require_credentials():
    if not KEY or not SECRET:
        sys.exit(
            "Faltan credenciales. Exporta CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET\n"
            "(Cloudinary console -> Settings -> API Keys)."
        )


def auth():
    require_credentials()
    return (KEY, SECRET)


def sign(params: dict) -> str:
    """Firma SHA-1: params ordenados (sin file/cloud_name/resource_type/api_key) + secret."""
    payload = "&".join(
        f"{k}={params[k]}" for k in sorted(params) if k not in EXCLUDED_FROM_SIGNATURE
    )
    return hashlib.sha1((payload + SECRET).encode("utf-8")).hexdigest()


def get_settings() -> dict:
    """La API de settings no existe en todas las cuentas; se ignora si da 404."""
    r = requests.get(f"{API}/settings", auth=auth(), timeout=60)
    if r.status_code == 404:
        return {}
    r.raise_for_status()
    return r.json()


def folder_mode() -> str:
    """El endpoint /folders solo existe en modo dynamic folders."""
    r = requests.get(f"{API}/folders", auth=auth(), timeout=60)
    if r.status_code == 200:
        return "dynamic"
    return "fixed"


def list_upload_presets() -> list:
    r = requests.get(f"{API}/upload_presets", auth=auth(), timeout=60)
    r.raise_for_status()
    return r.json().get("presets", [])


def list_public_ids(resource_type="image") -> set:
    """Todos los public_id ya presentes en la cuenta (paginado)."""
    ids = set()
    next_cursor = None
    while True:
        params = {"type": "upload", "max_results": 500}
        if next_cursor:
            params["next_cursor"] = next_cursor
        r = requests.get(
            f"{API}/resources/{resource_type}", params=params, auth=auth(), timeout=120
        )
        r.raise_for_status()
        data = r.json()
        for res in data.get("resources", []):
            ids.add(res["public_id"])
        next_cursor = data.get("next_cursor")
        if not next_cursor:
            return ids


def create_unsigned_preset(name: str, max_file_size: int):
    """Crea el preset unsigned que permite subir desde el navegador sin secreto.

    Notas de la API (comprobadas contra la cuenta):
      - Los tags/context que manda el cliente NO se aplican salvo 'context' (va a custom).
      - 'asset_folder' del cliente SÍ funciona si el preset no fija una carpeta.
    """
    body = {
        "name": name,
        "unsigned": True,
        "allowed_formats": "jpg,jpeg,png,webp,heic",
        "max_file_size": max_file_size,
        # Impide que un invitado pise las fotos curadas de la boda.
        "disallow_public_id": True,
        "tags": "boda,invitados",
        "context": "origen=invitados",
    }

    existing = [p for p in list_upload_presets() if p.get("name") == name]
    if existing:
        r = requests.put(
            f"{API}/upload_presets/{existing[0]['name']}", json=body, auth=auth(), timeout=60
        )
    else:
        r = requests.post(f"{API}/upload_presets", json=body, auth=auth(), timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code}: {r.text}")
    return r.json()


def upload_file(path: Path, public_id: str, tags: list, context: str, overwrite: bool):
    params = {"timestamp": int(time.time()), "public_id": public_id}
    if tags:
        params["tags"] = ",".join(tags)
    if context:
        params["context"] = context
    if overwrite:
        params["overwrite"] = "true"

    data = {k: str(v) for k, v in params.items()}
    data["api_key"] = KEY
    data["signature"] = sign(params)

    with path.open("rb") as fh:
        r = requests.post(
            f"{API}/image/upload",
            data=data,
            files={"file": (path.name, fh, "image/jpeg")},
            auth=auth(),
            timeout=300,
        )
    return r.json()


def cmd_status(args):
    print(f"cloud: {CLOUD}")
    print(f"modo de carpetas: {folder_mode()}")
    presets = list_upload_presets()
    print(f"presets ({len(presets)}):")
    for p in presets:
        print(f"  - {p.get('name')}  unsigned={p.get('unsigned')}")
    ids = list_public_ids()
    print(f"imágenes en la cuenta: {len(ids)}")
    return 0


def cmd_preset(args):
    result = create_unsigned_preset(args.name, args.max_file_size)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def cmd_upload(args):
    folder = Path(args.folder)
    if not folder.is_dir():
        sys.exit(f"No existe la carpeta: {folder}")

    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    if not files:
        sys.exit("No hay imágenes en la carpeta.")

    print(f"Carpeta: {folder}")
    print(f"Imágenes: {len(files)}")

    if not args.overwrite:
        existing = list_public_ids()
        print(f"Ya existentes en Cloudinary: {len(existing)}")
    else:
        existing = set()

    tags = [t for t in args.tags.split(",") if t] if args.tags else []
    manifest = []
    ok = skipped = failed = 0

    for i, path in enumerate(files, 1):
        public_id = path.stem  # para tipo image la extensión NO va en el public_id
        if public_id in existing:
            skipped += 1
            print(f"  [{i}/{len(files)}] {path.name} -> ya existe, se omite")
            continue
        try:
            res = upload_file(path, public_id, tags, args.context, args.overwrite)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  [{i}/{len(files)}] {path.name} -> ERROR {exc}")
            continue

        if res.get("error"):
            failed += 1
            print(f"  [{i}/{len(files)}] {path.name} -> ERROR {res['error'].get('message')}")
            continue

        ok += 1
        version = res.get("version")
        url = f"https://res.cloudinary.com/{CLOUD}/image/upload/v{version}/{public_id}.jpg"
        manifest.append(
            {
                "archivo": path.name,
                "public_id": res.get("public_id"),
                "version": version,
                "url": url,
                "secure_url": res.get("secure_url"),
            }
        )
        print(f"  [{i}/{len(files)}] {path.name} -> {res.get('public_id')}")

    out = Path(args.manifest)
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSubidas: {ok} | omitidas: {skipped} | fallidas: {failed}")
    print(f"Manifiesto: {out}")
    return 0 if failed == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="Gestor de fotos de boda en Cloudinary")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_status = sub.add_parser("status", help="Muestra settings y presets")
    p_status.set_defaults(func=cmd_status)

    p_preset = sub.add_parser("preset", help="Crea el preset unsigned de invitados")
    p_preset.add_argument("--name", default="boda-invitados")
    p_preset.add_argument("--max-file-size", type=int, default=10 * 1024 * 1024)
    p_preset.set_defaults(func=cmd_preset)

    p_upload = sub.add_parser("upload", help="Sube una carpeta de imágenes")
    p_upload.add_argument("folder")
    p_upload.add_argument("--tags", default="")
    p_upload.add_argument("--context", default="")
    p_upload.add_argument("--overwrite", action="store_true")
    p_upload.add_argument("--manifest", default="scripts/manifest_upload.json")
    p_upload.set_defaults(func=cmd_upload)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
