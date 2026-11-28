# Baja productos de México de Open Food Facts (base abierta, licencia ODbL) con tabla nutrimental completa.
# Uso: python -X utf8 scripts/alimentos_off.py [paginas]
# Escribe public/alimentos/mx.json: lo baja la app solo cuando buscas, así el bundle no crece.
# Formato por producto: [codigo, nombre, marca, porcion, gramos_porcion, kcal, proteina, carbs, azucar, grasa, fibra, sodio_mg] (todo por 100 g)
import json, os, re, sys, time, urllib.request

PAGINAS = int(sys.argv[1]) if len(sys.argv) > 1 else 40
CAMPOS = 'code,product_name_es,product_name,brands,serving_size,serving_quantity,nutriments,unique_scans_n'
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'public', 'alimentos', 'mx.json')
CLAVES = ['energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'sugars_100g', 'fat_100g', 'fiber_100g', 'sodium_100g']

def pedir(pagina, extra=''):
    url = f'https://world.openfoodfacts.org/api/v2/search?countries_tags_en=mexico&fields={CAMPOS}&page_size=100&page={pagina}&sort_by=unique_scans_n{extra}'
    for intento in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'bambu-app/1.0 (app personal sin fines de lucro)'})
            return json.load(urllib.request.urlopen(req, timeout=60)).get('products', [])
        except Exception as e:
            print('reintento', pagina, e); time.sleep(30 * (intento + 1))
    return []

def limpio(t): return re.sub(r'\s+', ' ', (t or '').strip())

vistos, out = set(), []
def agregar(productos):
    for p in productos:
        n = p.get('nutriments') or {}
        if any(not isinstance(n.get(k), (int, float)) for k in CLAVES[:5]): continue
        nombre = limpio(p.get('product_name_es') or p.get('product_name'))
        if not nombre or len(nombre) < 3 or p.get('code') in vistos: continue
        kcal = n['energy-kcal_100g']
        if not (0 <= kcal <= 900) or n['proteins_100g'] > 100 or n['sugars_100g'] > n['carbohydrates_100g'] + 1: continue
        vistos.add(p.get('code'))
        marca = limpio((p.get('brands') or '').split(',')[0])[:30]
        porcion = limpio(p.get('serving_size'))[:30]
        try: gramos = float(p.get('serving_quantity') or 0)
        except (TypeError, ValueError): gramos = 0
        r = lambda v: round(float(v or 0), 1)
        out.append([p['code'], nombre[:70], marca, porcion, r(gramos), r(kcal), r(n['proteins_100g']), r(n['carbohydrates_100g']), r(n['sugars_100g']), r(n['fat_100g']), r(n.get('fiber_100g')), round(float(n.get('sodium_100g') or 0) * 1000)])

# Primero la marca de Sam's Club (Member's Mark), luego lo más escaneado de México.
for pag in range(1, 4):
    agregar(pedir(pag, '&brands_tags=member-s-mark')); time.sleep(7)
for pag in range(1, PAGINAS + 1):
    lote = pedir(pag)
    if not lote: break
    agregar(lote)
    print('página', pag, 'llevo', len(out))
    time.sleep(12)

os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
# Nunca reemplaces un catálogo más grande con uno más chico (Open Food Facts a veces responde 503 a media descarga).
try: antes = len(json.load(open(SALIDA, encoding='utf8'))['productos'])
except Exception: antes = 0
if len(out) < antes: sys.exit(f'solo bajaron {len(out)} y ya había {antes}: no toco el archivo')
json.dump({'fuente': 'Open Food Facts (ODbL), productos de México', 'bajado': time.strftime('%Y-%m-%d'), 'productos': out}, open(SALIDA, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('escrito', len(out), 'productos', os.path.getsize(SALIDA), 'bytes')
