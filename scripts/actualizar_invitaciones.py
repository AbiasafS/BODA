#!/usr/bin/env python3
"""
Actualiza scripts/invitados.csv con una lista nueva de invitados.

Conserva el token de cada invitación que ya existía (para que los enlaces
enviados sigan funcionando), actualiza nombres y pases, agrega las nuevas
invitaciones con token nuevo y descarta las que ya no están.

Uso:
    python3 scripts/actualizar_invitaciones.py --xlsx "/ruta/lista_nueva.xlsx"
    python3 scripts/actualizar_invitaciones.py --xlsx "/ruta/lista_nueva.xlsx" --sin-prueba

El CSV contiene nombres, pases y tokens: NO se sube al repositorio.
"""

import argparse
import csv
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar_invitaciones import (  # noqa: E402
    COLUMNAS,
    DEFAULT_BASE,
    detectar_columnas,
    leer_filas,
    mensaje,
    nuevo_token,
)

DEFAULT_CSV = Path(__file__).resolve().parent / "invitados.csv"
TEST_NOMBRE = "Familia de Prueba"
TEST_TOKEN = "PRUEBA01"
TEST_PASES = 4


def normalizar(texto):
    """Minúsculas, sin acentos ni puntuación, para comparar nombres."""
    texto = unicodedata.normalize("NFKD", str(texto or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = texto.casefold()
    texto = re.sub(r"[^a-z0-9 ]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def leer_csv(ruta):
    with ruta.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def leer_lista(ruta):
    filas = leer_filas(ruta)
    inicio, col_nombre, col_pases = detectar_columnas(filas)
    lista = []
    for fila in filas[inicio:]:
        nombre = " ".join((fila.get(col_nombre) or "").split())
        if not nombre or "total" in nombre.casefold():
            continue
        crudo = fila.get(col_pases)
        try:
            pases = int(float(crudo))
        except (TypeError, ValueError):
            pases = 0
        lista.append({"nombre": nombre, "pases": pases})
    return lista


def fila_csv(token, nombre, pases, telefono, enlace):
    return {
        "Token": token,
        "Invitación": nombre,
        "Pases": pases,
        "Teléfono": telefono,
        "Enlace": enlace,
        "Mensaje": mensaje(nombre, pases, enlace),
        "Asistencia": "",
        "Personas": "",
        "Nombres": "",
        "Comentario": "",
        "Fecha": "",
        "Enviar": "",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", type=Path, required=True)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument(
        "--sin-prueba",
        action="store_true",
        help="No agregar la fila de prueba PRUEBA01.",
    )
    args = parser.parse_args()

    if not args.xlsx.exists():
        raise SystemExit(f"No existe el Excel: {args.xlsx}")
    if not args.csv.exists():
        raise SystemExit(f"No existe el CSV anterior: {args.csv}")

    salida = args.out or args.csv
    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"

    viejas = [r for r in leer_csv(args.csv) if r.get("Token") != TEST_TOKEN]
    nuevas = leer_lista(args.xlsx)

    usadas = set()
    tokens_usados = {r.get("Token", "").strip() for r in viejas if r.get("Token")}
    filas = []
    cambios = []
    agregadas = []
    sin_pases = []

    for inv in nuevas:
        indice = next(
            (
                i
                for i, r in enumerate(viejas)
                if i not in usadas
                and normalizar(r.get("Invitación")) == normalizar(inv["nombre"])
            ),
            None,
        )
        pases = inv["pases"] or 1
        if not inv["pases"]:
            sin_pases.append(inv["nombre"])

        if indice is not None:
            usadas.add(indice)
            vieja = viejas[indice]
            token = (vieja.get("Token") or "").strip().upper()
            if not token:
                token = nuevo_token(tokens_usados)
            telefono = vieja.get("Teléfono", "")
            try:
                pases_antes = int(float(vieja.get("Pases") or 0))
            except ValueError:
                pases_antes = 0
            if pases_antes != pases:
                cambios.append((inv["nombre"], pases_antes, pases))
        else:
            token = nuevo_token(tokens_usados)
            telefono = ""
            agregadas.append((inv["nombre"], pases))

        tokens_usados.add(token)
        enlace = f"{base}?inv={token}"
        filas.append(fila_csv(token, inv["nombre"], pases, telefono, enlace))

    eliminadas = [r for i, r in enumerate(viejas) if i not in usadas]

    if not args.sin_prueba:
        if TEST_TOKEN in tokens_usados:
            raise SystemExit(f"El token de prueba {TEST_TOKEN} ya está en uso.")
        enlace = f"{base}?inv={TEST_TOKEN}"
        filas.append(
            fila_csv(TEST_TOKEN, TEST_NOMBRE, TEST_PASES, "", enlace)
        )

    respaldo = args.csv.with_name(args.csv.stem + ".antes.csv")
    respaldo.write_bytes(args.csv.read_bytes())

    salida.parent.mkdir(parents=True, exist_ok=True)
    with salida.open("w", encoding="utf-8-sig", newline="") as f:
        escritor = csv.DictWriter(f, fieldnames=COLUMNAS, quoting=csv.QUOTE_MINIMAL)
        escritor.writeheader()
        escritor.writerows(filas)

    prueba = 0 if args.sin_prueba else 1
    reales = len(filas) - prueba
    pases_reales = sum(int(r["Pases"]) for r in filas) - (0 if args.sin_prueba else TEST_PASES)
    print(f"Invitaciones reales: {reales}")
    print(f"Pases reales: {pases_reales}")
    print(f"Filas en el CSV: {len(filas)}" + ("" if args.sin_prueba else " (incluye PRUEBA01)"))
    print(f"Respaldo del CSV anterior: {respaldo}")
    print(f"CSV nuevo: {salida}")

    print(f"\nCambios de pases ({len(cambios)}):")
    for nombre, antes, despues in cambios:
        print(f"  {nombre}: {antes} -> {despues}")

    print(f"\nAgregadas ({len(agregadas)}):")
    for nombre, pases in agregadas:
        print(f"  {nombre}: {pases}")

    print(f"\nEliminadas ({len(eliminadas)}):")
    for r in eliminadas:
        print(f"  {r.get('Invitación')}: {r.get('Pases')} (token {r.get('Token')})")

    if sin_pases:
        print("\nSin número de pases (se usó 1):")
        for nombre in sin_pases:
            print(f"  {nombre}")

    repetidos = [
        nombre
        for nombre, veces in Counter(
            normalizar(r["Invitación"]) for r in filas if r["Token"] != TEST_TOKEN
        ).items()
        if veces > 1
    ]
    if repetidos:
        print("\nNombres repetidos (revisar si son dos personas distintas):")
        for nombre in repetidos:
            print(f"  {nombre}")


if __name__ == "__main__":
    sys.exit(main())
