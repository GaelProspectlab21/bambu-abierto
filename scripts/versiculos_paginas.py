"""Genera src/lib/pageVerses.ts con los versículos al pie de cada página.

El texto sale de la Biblia libre Latinoamericana que ya vive en public/biblia/bll (licencia libre,
sin red). Así el pie de página nunca cita un texto distinto del que Gael lee en la app.
Uso: python -X utf8 scripts/versiculos_paginas.py [--ver]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLL = ROOT / "public" / "biblia" / "bll"
OUT = ROOT / "src" / "lib" / "pageVerses.ts"

# (libro, capítulo, versículo inicial, versículo final, nombre para mostrar)
PAGES = {
    "Hoy": [(19, 118, 24, 24, "Salmo"), (25, 3, 22, 23, "Lamentaciones"), (40, 6, 34, 34, "Mateo"), (20, 16, 3, 3, "Proverbios")],
    "Entrenar": [(46, 9, 24, 24, "1 Corintios"), (54, 4, 8, 8, "1 Timoteo"), (23, 40, 31, 31, "Isaías"), (46, 6, 19, 20, "1 Corintios")],
    "Comida": [(46, 10, 31, 31, "1 Corintios"), (40, 4, 4, 4, "Mateo"), (54, 4, 4, 5, "1 Timoteo"), (40, 6, 11, 11, "Mateo")],
    "Tareas": [(51, 3, 23, 23, "Colosenses"), (20, 21, 5, 5, "Proverbios"), (20, 14, 23, 23, "Proverbios"), (20, 13, 4, 4, "Proverbios")],
    "Noche": [(19, 4, 8, 8, "Salmo"), (40, 11, 28, 28, "Mateo"), (50, 4, 6, 7, "Filipenses"), (19, 127, 2, 2, "Salmo")],
    "Hábitos": [(48, 6, 9, 9, "Gálatas"), (58, 12, 11, 11, "Hebreos"), (50, 3, 13, 14, "Filipenses"), (42, 16, 10, 10, "Lucas")],
}


def text_of(book: int, chapter: int, a: int, b: int) -> str:
    data = json.loads((BLL / f"{book}.json").read_text(encoding="utf-8"))
    verses = dict((n, t) for n, t in data["capitulos"][chapter - 1])
    parts = [verses[v] for v in range(a, b + 1)]
    text = " ".join(p.strip() for p in parts).replace("“", "").replace("”", "").strip()
    text = text.rstrip(",;: ")
    return text if text[-1] in ".?!" else text + "."


def main() -> None:
    rows = []
    for page, refs in PAGES.items():
        for book, ch, a, b, name in refs:
            t = text_of(book, ch, a, b)
            ref = f"{name} {ch}, {a}" + (f"-{b}" if b != a else "")
            rows.append((page, ref, t, book, ch, a))
            if "--ver" in sys.argv:
                print(f"[{page}] {ref}: {t}")
    if "--ver" in sys.argv:
        return
    lines = [
        "// Generado por scripts/versiculos_paginas.py desde la Biblia libre Latinoamericana. No editar a mano.",
        "export type PageVerse = { ref: string; text: string; book: number; chapter: number; verse: number }",
        "export const PAGE_VERSES: Record<string, PageVerse[]> = {",
    ]
    for page in PAGES:
        lines.append(f"  {json.dumps(page, ensure_ascii=False)}: [")
        for p, ref, t, book, ch, a in rows:
            if p == page:
                lines.append(f"    {{ ref: {json.dumps(ref, ensure_ascii=False)}, text: {json.dumps(t, ensure_ascii=False)}, book: {book}, chapter: {ch}, verse: {a} }},")
        lines.append("  ],")
    lines.append("}")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(rows)} versículos en {OUT.name}")


if __name__ == "__main__":
    main()
