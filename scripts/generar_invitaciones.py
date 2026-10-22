#!/usr/bin/env python3
"""
Genera scripts/invitados.csv a partir del Excel de la lista de invitados.

Uso:
    python3 scripts/generar_invitaciones.py
    python3 scripts/generar_invitaciones.py --xlsx "/ruta/lista.xlsx"
    python3 scripts/generar_invitaciones.py --base-url "https://boda.abiasafsalazar.com/"

El CSV contiene nombres y pases, así que NO se sube al repositorio
(está incluido en .gitignore).
"""

import argparse
import csv
import re
import secrets
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin I, O, 0, 1
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
DEFAULT_XLSX = Path.home() / "Descargas" / "Lista de Invitaos Boda P&G_120055.xlsx"
DEFAULT_OUT = Path(__file__).resolve().parent / "invitados.csv"
DEFAULT_BASE = "https://boda.abiasafsalazar.com/"
COLUMNAS = [
    "Token",
    "Invitación",
    "Pases",
    "Teléfono",
    "Enlace",
    "Mensaje",
    "Asistencia",
    "Personas",
    "Nombres",
    "Comentario",
    "Fecha",
    "Enviar",
]


def texto_de_celda(celda, compartidos):
    tipo = celda.get("t")
    valor = celda.find("m:v", NS)
    if tipo == "s" and valor is not None:
        return compartidos[int(valor.text)]
    if tipo == "inlineStr":
        return "".join(
            nodo.text or ""
            for nodo in celda.iter(
                "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
            )
        )
    if valor is not None:
        return valor.text or ""
    return ""


def numero_columna(ref):
    letras = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for letra in letras:
        n = n * 26 + (ord(letra) - 64)
    return n


def leer_filas(ruta):
    with zipfile.ZipFile(ruta) as libro:
        compartidos = []
        if "xl/sharedStrings.xml" in libro.namelist():
            raiz = ET.fromstring(libro.read("xl/sharedStrings.xml"))
            for si in raiz.findall("m:si", NS):
                compartidos.append(
                    "".join(
                        nodo.text or ""
                        for nodo in si.iter(
                            "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                        )
                    )
                )

        hojas = sorted(
            n
            for n in libro.namelist()
            if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")
        )
        if not hojas:
            raise SystemExit("El Excel no tiene hojas.")

        raiz = ET.fromstring(libro.read(hojas[0]))
        filas = []
        for fila in raiz.findall(".//m:sheetData/m:row", NS):
            valores = {}
            for celda in fila.findall("m:c", NS):
                texto = texto_de_celda(celda, compartidos).strip()
                if texto:
                    valores[numero_columna(celda.get("r"))] = texto
            if valores:
                filas.append(valores)
        return filas


def detectar_columnas(filas):
    """Busca la cabecera y devuelve (fila_inicio, col_nombre, col_pases)."""
    for i, fila in enumerate(filas):
        nombre = None
        pases = None
        for col, texto in fila.items():
            bajo = texto.lower()
            if "invitado" in bajo or "nombre" in bajo:
                nombre = col
            if "person" in bajo or "perosn" in bajo or "pase" in bajo:
                pases = col
        if nombre and pases:
            return i + 1, nombre,pases
    raise SystemExit(
        "No encontré las columnas 'Nombre del invitado' y 'Número de personas'."
    )


def nuevo_token(usados):
    while True:
        token = "".join(secrets.choice(ABC) for _ in range(10))
        if token not in usados:
            usados.add(token)
            return token


def mensaje(nombre, pases, enlace):
    cuantas = "1 persona" if pases == 1 else f"{pases} personas"
    return (
        f"Hola {nombre} 💚\n\n"
        "Con mucha alegría los invitamos a nuestra boda el 26 de diciembre de 2026.\n\n"
        f"Su invitación es para {cuantas}.\n\n"
        f"Confirma aquí: {enlace}\n\n"
        "Pablo & Gesuri"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", type=Path, default=DEFAULT_XLSX)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    args = parser.parse_args()

    if not args.xlsx.exists():
        raise SystemExit(f"No existe el Excel: {args.xlsx}")

    filas = leer_filas(args.xlsx)
    inicio, col_nombre, col_pases = detectar_columnas(filas)

    invitaciones = []
    for fila in filas[inicio:]:
        nombre = " ".join((fila.get(col_nombre) or "").split())
        if not nombre:
            continue
        if "total" in nombre.lower():
            continue
        crudo = fila.get(col_pases)
        pases = None
        if crudo:
            try:
                pases = int(float(crudo))
            except ValueError:
                pases = None
        invitaciones.append({"nombre": nombre, "pases": pases})

    # Si un nombre se repite y una de las filas no trae pases, se descarta la vacía.
    por_nombre = {}
    for inv in invitaciones:
        por_nombre.setdefault(inv["nombre"].casefold(), []).append(inv)

    limpias = []
    descartadas = []
    for grupo in por_nombre.values():
        con_pases = [x for x in grupo if x["pases"]]
        if len(grupo) > 1 and con_pases:
            limpias.extend(con_pases)
            descartadas.extend(x for x in grupo if not x["pases"])
        else:
            limpias.extend(grupo)

    # Fila de prueba (se puede borrar después de probar).
    limpias.append({"nombre": "Familia de Prueba", "pases": 4, "token": "PRUEBA01"})

    base = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    usados = set()
    filas_csv = []
    total_pases = 0

    for inv in limpias:
        token = inv.get("token") or nuevo_token(usados)
        usados.add(token)
        pases = inv["pases"] or 1
        total_pases += pases
        enlace = f"{base}?inv={token}"
        filas_csv.append(
            {
                "Token": token,
                "Invitación": inv["nombre"],
                "Pases": pases,
                "Teléfono": "",
                "Enlace": enlace,
                "Mensaje": mensaje(inv["nombre"], pases, enlace),
                "Asistencia": "",
                "Personas": "",
                "Nombres": "",
                "Comentario": "",
                "Fecha": "",
                "Enviar": "",
            }
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8-sig", newline="") as f:
        escritor = csv.DictWriter(f, fieldnames=COLUMNAS, quoting=csv.QUOTE_MINIMAL)
        escritor.writeheader()
        escritor.writerows(filas_csv)

    print(f"Invitaciones: {len(filas_csv)} (incluye la fila de prueba PRUEBA01)")
    print(f"Pases: {total_pases} (la fila de prueba suma 4)")
    print(f"Descartadas por duplicado sin pases: {len(descartadas)}")
    for d in descartadas:
        print(f"  - {d['nombre']} (sin número de pases)")
    print(f"Archivo: {args.out}")
    print("Recuerda: NO subir este CSV al repositorio.")


if __name__ == "__main__":
    sys.exit(main())
