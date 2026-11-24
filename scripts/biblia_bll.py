"""Convierte la Biblia libre Latinoamericana (eBible.org, dominio público) a un JSON por libro.

Salida: public/biblia/bll/<id>.json con {"id", "nombre", "capitulos": [[[verso, texto], ...], ...]}
y public/biblia/bll/indice.json con la fuente, la licencia, la huella sha256 y los conteos.
Los ids son los de src/lib/bible.ts: 1 a 66 en el orden de siempre, 67 a 73 los deuterocanónicos.
Ester y Daniel salen de su versión griega (ESG, DNG): así traen las partes que lee la Iglesia católica.

Uso: python -X utf8 scripts/biblia_bll.py            (descarga de eBible.org)
     python -X utf8 scripts/biblia_bll.py ruta.zip   (usa un zip ya descargado)
"""
from __future__ import annotations

import hashlib
import io
import json
import logging
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_exponential

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "biblia" / "bll"
URL = "https://eBible.org/Scriptures/spabll_vpl.zip"
# Código del texto -> id de bambú. Orden protestante de siempre (1 a 66) y luego los católicos.
CODES = [
    "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH",
    "ESG", "JOB", "PSA", "PRO", "ECC", "SOL", "ISA", "JER", "LAM", "EZE", "DNG", "HOS", "JOE", "AMO", "OBA", "JON",
    "MIC", "NAH", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MAR", "LUK", "JOH", "ACT", "ROM", "1CO", "2CO", "GAL",
    "EPH", "PHI", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAM", "1PE", "2PE", "1JO", "2JO", "3JO",
    "JUD", "REV", "TOB", "JDT", "1MA", "2MA", "WIS", "SIR", "BAR",
]
NAMES = {67: "Tobías", 68: "Judit", 69: "1 Macabeos", 70: "2 Macabeos", 71: "Sabiduría", 72: "Eclesiástico", 73: "Baruc"}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20), reraise=True)
def download() -> bytes:
    req = urllib.request.Request(URL, headers={"User-Agent": "bambu-biblia/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def parse(text: str) -> dict[str, dict[int, list[tuple[int, str]]]]:
    books: dict[str, dict[int, list[tuple[int, str]]]] = {}
    for line in text.splitlines():
        m = re.match(r"(\w{3}) (\d+):(\d+) (.*)", line)
        if not m:
            continue
        code, chap, verse, body = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        if body:
            books.setdefault(code, {}).setdefault(chap, []).append((verse, body))
    return books


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else download()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        text = z.read("spabll_vpl.txt").decode("utf-8")
    books = parse(text)
    missing = [c for c in CODES if c not in books]
    if missing:
        raise SystemExit(f"Faltan libros en el texto: {missing}")
    OUT.mkdir(parents=True, exist_ok=True)
    counts = {}
    for i, code in enumerate(CODES, start=1):
        chapters = books[code]
        last = max(chapters)
        if sorted(chapters) != list(range(1, last + 1)):
            raise SystemExit(f"{code}: capítulos con huecos")
        payload = {"id": i, "codigo": code, "capitulos": [[[v, t] for v, t in chapters[c]] for c in range(1, last + 1)]}
        if i in NAMES:
            payload["nombre"] = NAMES[i]
        (OUT / f"{i}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        counts[i] = last
    index = {
        "version": "bll", "titulo": "Biblia libre Latinoamericana", "fuente": URL,
        "licencia": "Dominio público (eBible.org). Traducción en revisión.",
        "sha256": hashlib.sha256(raw).hexdigest(), "capitulos": counts,
    }
    (OUT / "indice.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.glob("*.json"))
    logging.info("%d libros, %d capítulos, %d KB en %s", len(counts), sum(counts.values()), size // 1024, OUT)


if __name__ == "__main__":
    main()
