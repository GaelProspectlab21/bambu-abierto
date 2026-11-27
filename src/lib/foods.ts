/**
 * Comida mexicana de todos los días en porciones caseras (pieza, taza, palma). Valores por porción,
 * redondeados de USDA FoodData Central; los platillos son un promedio de preparación casera, así que
 * son estimados (±25%, lo mismo que medir a ojo con la mano). Precisión suficiente para ver
 * tendencias; el motor se calibra con TU peso, no con la tabla.
 */
import type { FoodGroup, MealItem } from './model'
import { MAS } from './foodsMas'

export type Food = { id: string; name: string; unit: string; kcal: number; protein: number; group: FoodGroup; words?: string; estimated?: boolean; source?: string }

const f = (id: string, name: string, unit: string, kcal: number, protein: number, group: FoodGroup, words?: string): Food => ({ id, name, unit, kcal, protein, group, words })

export const FOODS: Food[] = [
  // Etiqueta mexicana del fabricante, consultada 23-nov-2026. No confundir mini de 30 g con barra de 45 g.
  // https://www.thewildfoods.com.mx/cdn/shop/files/tablaminicacahuate.jpg?v=1771208901&width=480
  { ...f('wild-mini', 'Wild Protein Mini chocolate cacahuate', 'barra (30 g)', 115, 10.3, 'proteina', 'barrita wild foods mini'), source: 'https://www.thewildfoods.com.mx/products/wild-protein-mini-chocolate-cacahate-12-unidades' },
  // https://www.yoplait.com.mx/producto/yoghurt-griego-batido-natural/ por 100 g: 84 kcal, 7.3 g proteína.
  { ...f('yoplait-natural', 'Yoplait griego batido natural', 'porción (100 g)', 84, 7.3, 'lacteo'), source: 'https://www.yoplait.com.mx/producto/yoghurt-griego-batido-natural/' },
  // https://www.yoplait.com.mx/producto/yoghurt-griego-batido-fresa/ por 100 g: 78 kcal, 6.2 g. Envase de 145 g.
  { ...f('yoplait-fresa', 'Yoplait griego batido fresa', 'vasito (145 g)', 113, 9, 'lacteo', 'yoplait sabor'), source: 'https://www.yoplait.com.mx/producto/yoghurt-griego-batido-fresa/' },
  // No se verificó etiqueta Member's Mark. Sam's lista Progourmet 90 g; no se atribuyen sus valores a otra marca.
  // Estimación de receta: masa, queso y elote. Sustituir usando la etiqueta del envase real.
  { ...f('empanada-elote', 'Empanada de queso con elote, estimado', 'pieza mediana (90 g)', 240, 7, 'platillo', "sams sam's members mark progourmet"), estimated: true },
  // Básicos nuevos: promedios aproximados, no etiquetas de marca. Referencia general: https://fdc.nal.usda.gov/
  { ...f('granola', 'Granola', 'puñito (30 g)', 140, 3, 'cereal'), estimated: true },
  { ...f('camote', 'Camote cocido', 'pieza chica (130 g)', 112, 2, 'cereal'), estimated: true },
  { ...f('amaranto', 'Amaranto inflado', 'taza (28 g)', 105, 4, 'cereal'), estimated: true },
  { ...f('pepitas', 'Pepitas de calabaza', 'puñito (30 g)', 170, 9, 'grasa'), estimated: true },
  { ...f('pasas', 'Pasas', 'puñito (30 g)', 90, 1, 'fruta'), estimated: true },
  { ...f('requeson', 'Requesón', 'media taza (100 g)', 140, 12, 'lacteo'), estimated: true },
  { ...f('sardinas', 'Sardinas', 'porción escurrida (100 g)', 208, 25, 'proteina'), estimated: true },
  { ...f('hummus', 'Hummus de garbanzo', '2 cucharadas (30 g)', 70, 2, 'leguminosa'), estimated: true },
  // Combinaciones de las porciones ya existentes. La preparación real puede variar.
  { ...f('avena-leche', 'Avena preparada con leche', 'tazón', 300, 13, 'platillo', 'desayuno'), estimated: true }, // avena 150 + leche 150
  { ...f('mollete', 'Mollete con frijoles y panela', 'bolillo completo', 400, 19, 'platillo'), estimated: true }, // 170 + 130 + 100
  { ...f('huevo-frijoles', 'Huevos con frijoles', '2 huevos y media taza', 259, 20.1, 'platillo'), estimated: true }, // 144 + 115
  { ...f('yogur-fruta-granola', 'Yogur con plátano y granola', 'tazón', 345, 21.3, 'platillo'), estimated: true }, // 100 + 105 + 140
  // Proteína
  f('huevo', 'Huevo', 'pieza', 72, 6.3, 'proteina', 'estrellado revuelto cocido'),
  f('pollo', 'Pechuga de pollo', 'palma (100 g)', 165, 31, 'proteina', 'asada plancha'),
  f('res', 'Carne de res asada', 'palma (100 g)', 220, 26, 'proteina', 'bistec arrachera'),
  f('molida', 'Carne molida', 'palma (100 g)', 217, 26, 'proteina', 'picadillo'),
  f('atun', 'Atún en agua', 'lata', 116, 26, 'proteina'),
  f('pescado', 'Pescado blanco', 'palma (100 g)', 128, 26, 'proteina', 'tilapia mojarra filete'),
  f('jamon', 'Jamón de pavo', '2 rebanadas', 45, 7, 'proteina'),
  f('salchicha', 'Salchicha', 'pieza', 130, 5, 'proteina'),
  f('cerdo', 'Carne de cerdo', 'palma (100 g)', 240, 27, 'proteina', 'chuleta lomo carnitas'),
  f('polvo', 'Proteína en polvo', 'medida', 120, 24, 'proteina', 'whey batido'),
  // Lácteos
  f('leche', 'Leche entera', 'vaso (250 ml)', 150, 8, 'lacteo'),
  f('leche-light', 'Leche light', 'vaso (250 ml)', 100, 8, 'lacteo', 'descremada deslactosada'),
  f('yogur-griego', 'Yogur griego natural', 'vasito (170 g)', 100, 17, 'lacteo'),
  f('yogur', 'Yogur de sabor', 'vasito', 150, 6, 'lacteo', 'bebible'),
  f('panela', 'Queso panela', 'rebanada gruesa (40 g)', 100, 7, 'lacteo'),
  f('oaxaca', 'Queso Oaxaca', 'puño chico (30 g)', 100, 7, 'lacteo', 'quesillo'),
  f('amarillo', 'Queso amarillo', 'rebanada', 60, 3, 'lacteo'),
  // Leguminosas y semillas
  f('frijoles', 'Frijoles de olla', '1/2 taza', 115, 7.5, 'leguminosa'),
  f('refritos', 'Frijoles refritos', '1/2 taza', 130, 7, 'leguminosa'),
  f('lentejas', 'Lentejas', '1/2 taza', 115, 9, 'leguminosa'),
  f('garbanzo', 'Garbanzo', '1/2 taza', 135, 7, 'leguminosa'),
  f('cacahuates', 'Cacahuates', 'puñito (30 g)', 170, 7, 'grasa'),
  // Cereales y tubérculos
  f('tortilla', 'Tortilla de maíz', 'pieza', 65, 1.7, 'cereal'),
  f('tortilla-harina', 'Tortilla de harina', 'pieza', 140, 4, 'cereal'),
  f('arroz', 'Arroz', '1/2 taza', 100, 2, 'cereal', 'rojo blanco'),
  f('bolillo', 'Bolillo', 'pieza', 170, 5, 'cereal', 'telera pan'),
  f('pan-caja', 'Pan de caja', 'rebanada', 70, 2.5, 'cereal', 'integral'),
  f('avena', 'Avena', '1/2 taza cruda', 150, 5, 'cereal'),
  f('pasta', 'Pasta o espagueti', 'taza cocida', 220, 8, 'cereal', 'sopa'),
  f('cereal-caja', 'Cereal de caja', 'taza', 120, 2, 'cereal', 'hojuelas'),
  f('papa', 'Papa', 'pieza mediana', 160, 4, 'cereal'),
  f('tostada', 'Tostada', 'pieza', 60, 1, 'cereal'),
  f('elote', 'Elote', 'pieza', 90, 3.3, 'cereal', 'esquite'),
  // Frutas
  f('platano', 'Plátano', 'pieza', 105, 1.3, 'fruta'),
  f('manzana', 'Manzana', 'pieza', 95, 0.5, 'fruta'),
  f('naranja', 'Naranja', 'pieza', 62, 1.2, 'fruta', 'mandarina'),
  f('papaya', 'Papaya', 'taza', 62, 0.7, 'fruta'),
  f('mango', 'Mango', 'taza', 100, 1.4, 'fruta'),
  f('fresas', 'Fresas', 'taza', 50, 1, 'fruta'),
  f('sandia', 'Sandía o melón', 'taza', 50, 0.9, 'fruta'),
  f('uvas', 'Uvas', 'taza', 104, 1, 'fruta'),
  // Verduras
  f('ensalada', 'Ensalada verde', 'taza', 15, 1, 'verdura', 'lechuga'),
  f('brocoli', 'Brócoli', 'taza', 55, 3.7, 'verdura'),
  f('calabacita', 'Calabacita', 'taza', 20, 1.5, 'verdura'),
  f('zanahoria', 'Zanahoria', 'pieza', 25, 0.6, 'verdura'),
  f('jitomate', 'Jitomate', 'pieza', 22, 1, 'verdura', 'tomate'),
  f('nopales', 'Nopales', 'taza', 22, 2, 'verdura'),
  f('verduras', 'Verduras mixtas', 'taza', 50, 2, 'verdura', 'chicharos ejotes'),
  // Grasas
  f('aguacate', 'Aguacate', '1/3 de pieza', 80, 1, 'grasa', 'guacamole'),
  f('aceite', 'Aceite', 'cucharada', 120, 0, 'grasa'),
  f('crema-cacahuate', 'Crema de cacahuate', 'cucharada', 95, 3.5, 'grasa'),
  f('nueces', 'Nueces o almendras', 'puñito (30 g)', 185, 5, 'grasa'),
  f('mantequilla', 'Mantequilla', 'cucharadita', 35, 0, 'grasa'),
  f('crema', 'Crema', 'cucharada', 45, 0.5, 'grasa'),
  f('mayonesa', 'Mayonesa', 'cucharada', 95, 0, 'grasa'),
  // Platillos
  f('taco-pastor', 'Taco de pastor', 'pieza', 150, 9, 'platillo'),
  f('taco-asada', 'Taco de asada', 'pieza', 160, 10, 'platillo'),
  f('quesadilla', 'Quesadilla', 'pieza', 200, 9, 'platillo'),
  f('torta', 'Torta de jamón', 'pieza', 450, 20, 'platillo'),
  f('tamal', 'Tamal', 'pieza', 285, 8, 'platillo'),
  f('enchiladas', 'Enchiladas', 'orden de 3', 450, 18, 'platillo', 'entomatadas'),
  f('chilaquiles', 'Chilaquiles', 'plato', 500, 15, 'platillo'),
  f('pozole', 'Pozole', 'plato', 350, 22, 'platillo'),
  f('sopa-fideo', 'Sopa de fideo', 'plato', 150, 4, 'platillo'),
  f('burrito', 'Burrito', 'pieza', 450, 20, 'platillo'),
  f('hamburguesa', 'Hamburguesa', 'pieza', 500, 25, 'platillo'),
  f('pizza', 'Pizza', 'rebanada', 285, 12, 'platillo'),
  f('sandwich', 'Sándwich de jamón y queso', 'pieza', 300, 16, 'platillo'),
  f('licuado', 'Licuado de plátano con leche', 'vaso', 260, 9, 'platillo'),
  // Bebidas y antojos
  f('refresco', 'Refresco', 'lata', 140, 0, 'bebida', 'coca soda'),
  f('jugo', 'Jugo de naranja', 'vaso', 112, 1.7, 'bebida'),
  f('agua-fresca', 'Agua de sabor', 'vaso', 100, 0, 'bebida', 'jamaica horchata'),
  f('cafe-leche', 'Café con leche', 'taza', 70, 4, 'bebida'),
  f('pan-dulce', 'Pan dulce', 'pieza', 280, 6, 'dulce', 'concha dona'),
  f('galletas', 'Galletas', '3 piezas', 150, 2, 'dulce'),
  f('papitas', 'Papitas', 'bolsa chica', 240, 3, 'dulce', 'sabritas frituras'),
  f('chocolate', 'Chocolate', 'barra chica', 250, 3, 'dulce'),
  f('helado', 'Helado', '1/2 taza', 140, 2.5, 'dulce', 'nieve'),
  f('pastelito', 'Pastelito empaquetado', 'pieza', 180, 2, 'dulce', 'gansito'),
  // v11: el catálogo grande (foodsMas.ts). Si un id ya existe arriba, gana el de arriba.
]
const ARRIBA = new Set(FOODS.map(x => x.id))
for (const [id, name, unit, kcal, protein, group, words] of MAS) if (!ARRIBA.has(id)) FOODS.push({ ...f(id, name, unit, kcal, protein, group, words), estimated: true })

/**
 * A ojo con la mano (método de porciones con la mano de Precision Nutrition). Una palma de
 * proteína, un puño de carbohidrato, un puño de verdura, un pulgar de grasa. Tu mano crece contigo,
 * así que la porción se ajusta sola.
 */
export const HAND: Food[] = [
  f('mano-palma', 'Palma de proteína', 'palma', 130, 24, 'proteina', 'carne pollo huevo pescado'),
  f('mano-carbo', 'Puño de carbohidrato', 'puño', 120, 3, 'cereal', 'arroz tortilla pan pasta papa'),
  f('mano-verdura', 'Puño de verdura', 'puño', 25, 1.5, 'verdura'),
  f('mano-fruta', 'Pieza de fruta', 'pieza', 80, 1, 'fruta'),
  f('mano-grasa', 'Pulgar de grasa', 'pulgar', 100, 0, 'grasa', 'aceite aguacate crema'),
]

const ALL = [...FOODS, ...HAND]
export function foodById(id: string): Food | undefined { return ALL.find(x => x.id === id) }

const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
/** Busca por nombre y por palabras sueltas, sin acentos. Lo que empieza igual va primero. */
export function searchFoods(query: string, limit = 12): Food[] {
  const q = plain(query.trim())
  if (!q) return []
  const hits = FOODS.map(x => {
    const name = plain(x.name), words = plain(x.words ?? '')
    const score = name.startsWith(q) ? 3 : name.split(' ').some(w => w.startsWith(q)) ? 2 : (name.includes(q) || words.includes(q)) ? 1 : 0
    return { x, score }
  }).filter(h => h.score > 0)
  return hits.sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name)).slice(0, limit).map(h => h.x)
}

/** Una porción del catálogo por cantidad, ya multiplicada. */
export function itemOf(food: Food, qty: number): MealItem {
  return { name: food.name, qty, unit: food.unit, kcal: Math.round(food.kcal * qty), protein: Math.round(food.protein * qty * 10) / 10, group: food.group, foodId: food.id }
}
