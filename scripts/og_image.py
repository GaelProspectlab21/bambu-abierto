"""Imagen para compartir (Open Graph, 1200x630): la que sale al pegar el enlace en WhatsApp.

Usa los colores de marca de src/tokens.css y la mascota real (public/brote.svg). No es IA.
Uso: python -X utf8 scripts/og_image.py
"""
import logging
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-soft-normal.woff2"
BROTE = (ROOT / "public/brote.svg").read_text(encoding="utf-8")
HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: F; src: url('{FONT.as_uri()}') format('woff2'); font-weight: 100 900; }}
body {{ margin: 0; width: 1200px; height: 630px; display: grid; grid-template-columns: 420px 1fr; align-items: center;
  background: radial-gradient(circle at 22% 50%, #edf4ef 0 230px, #f4f6f4 231px); font-family: 'Avenir Next', 'Segoe UI', sans-serif; color: #17221d; }}
.art {{ display: grid; place-items: center; }} .art svg {{ width: 330px; height: 330px; }}
.brand {{ font-family: F; font-variation-settings: 'SOFT' 100; font-weight: 650; font-size: 64px; color: #225b46; letter-spacing: -.02em; }}
h1 {{ font-family: F; font-variation-settings: 'SOFT' 100; font-weight: 620; font-size: 66px; line-height: 1.04; margin: 10px 0 18px; letter-spacing: -.02em; }}
p {{ font-size: 28px; line-height: 1.4; color: #4f5c55; margin: 0 60px 0 0; }}
.chips {{ display: flex; gap: 12px; margin-top: 30px; }}
.chip {{ padding: 10px 18px; border-radius: 999px; background: #fff; border: 2px solid #e1e7e3; font-size: 22px; font-weight: 650; box-shadow: 0 4px 0 #d6dfd9; }}
.chip.sun {{ background: #f6c443; border-color: #d6a325; color: #2b2208; box-shadow: 0 4px 0 #9c7410; }}
</style></head><body>
<div class="art">{BROTE}</div>
<div><div class="brand">bambú</div><h1>Mide cuánto das,<br>no cuánto produces.</h1>
<p>Lectura, entreno, enfoque y hábitos. Prometes en la mañana; en la noche, los hechos te dicen si lo diste.</p>
<div class="chips"><span class="chip sun">Gratis</span><span class="chip">Sin cuenta</span><span class="chip">Tus datos en tu teléfono</span></div></div>
</body></html>"""


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    out = ROOT / "public/og.png"
    page_file = ROOT / "scripts/.og.html"
    page_file.write_text(HTML, encoding="utf-8")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1200, "height": 630})
            page.goto(page_file.as_uri())
            page.wait_for_timeout(400)
            page.screenshot(path=str(out))
            browser.close()
    finally:
        page_file.unlink(missing_ok=True)
    logging.info("escrito %s (%d KB)", out, out.stat().st_size // 1024)


if __name__ == "__main__":
    main()
