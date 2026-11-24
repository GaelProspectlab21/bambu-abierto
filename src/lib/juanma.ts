/**
 * Lo que enseña Juanma Arbeláez, destilado de 57 videos de su canal y con cada cita
 * comprobada palabra por palabra contra la transcripción (cerebro de la mesa de debate:
 * skills/mesa-debate/cerebros/juanma-arbelaez). Aquí va solo lo que usa el coach.
 */
/** Fuentes médicas para confirmar lo que toca la salud. Se enseñan juntas en Entrenar, Coach; no van en línea. */
export const SOURCES: { title: string; org: string; about: string; url: string }[] = [
  { title: 'Cuánto movimiento necesitan niños y adolescentes', org: 'OMS', about: 'actividad física', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
  { title: 'Guía de actividad física para jóvenes', org: 'NHS (Reino Unido)', about: 'fuerza y movimiento', url: 'https://www.nhs.uk/live-well/exercise/exercise-guidelines/physical-activity-guidelines-children-and-young-people/' },
  { title: 'Entrenamiento de fuerza para adolescentes', org: 'KidsHealth', about: 'técnica y seguridad', url: 'https://kidshealth.org/en/teens/strength-training.html' },
  { title: 'Consejos de sueño para adolescentes', org: 'NHS', about: 'horas y rutina', url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/sleep-tips-for-teenagers/' },
  { title: 'Hábitos de sueño saludables', org: 'NHLBI (EE. UU.)', about: 'horas por edad', url: 'https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits' },
  { title: 'Dolor de pecho', org: 'MedlinePlus', about: 'cuándo pedir ayuda', url: 'https://medlineplus.gov/chestpain.html' },
  { title: 'Alimentación saludable', org: 'HealthyChildren (AAP)', about: 'comida real y proteína', url: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/default.aspx' },
]

export type Principle = { id: string; area: 'entreno' | 'masa' | 'comida' | 'sueño' | 'mente'; title: string; body: string; quote: string; source: string }

export const PRINCIPLES: Principle[] = [
  { id: 'split', area: 'entreno', title: 'Torso y pierna, pocas series y duras', source: 'J009',
    body: 'Juanma tuvo sus mejores ganancias con torso tres veces y pierna dos veces por semana, dos series por ejercicio llevadas al fallo. Poco volumen, mucha intensidad, y así se recupera bien.',
    quote: 'Hago un split upper lower, upper tres veces y lower dos veces a la semana, que me ha funcionado de maravilla.' },
  { id: 'double', area: 'entreno', title: 'Doble progresión', source: 'J004',
    body: 'Trabajas en un rango, por ejemplo 10 a 15. Cuando todas tus series llegan al tope, subes la dificultad o el peso y vuelves al piso del rango. Primero más repeticiones, luego más carga.',
    quote: 'Así funciona la sobrecarga progresiva, específicamente el método de doble progresión.' },
  { id: 'log', area: 'entreno', title: 'Registra cada entreno', source: 'J004',
    body: 'Si no sabes qué hiciste la vez pasada, no sabes si progresas. Por eso esta app guarda cada serie.',
    quote: 'por favor registra tus entrenamientos.' },
  { id: 'neck', area: 'entreno', title: 'Cuello: flexión y extensión', source: 'J004',
    body: 'Solo dos movimientos cubren casi todo el cuello. Calienta con rotaciones suaves, empieza con tu peso y cuando pases de 20 repeticiones mete libros con una toalla. Bajada controlada siempre.',
    quote: 'No no vale la pena entrenarlo tan pesado porque si algo no queremos lesionar es el cuello.' },
  { id: 'photos', area: 'masa', title: 'Fotos de progreso cada mes', source: 'J001',
    body: 'Frente, lado y espalda, sin camiseta, a la misma hora y con la misma luz: al levantarte, después del baño y antes de comer. El espejo de un día miente; la comparación de meses no.',
    quote: 'Te sugiero que sea después de levantarte y después después de entrar al baño y antes de haber comido o tomado nada.' },
  { id: 'lean', area: 'masa', title: 'Delgado y creciendo: volumen limpio', source: 'J010',
    body: 'Si estás delgado no hay nada que definir. Lo que toca es subir de peso despacio con comida real, para que casi todo sea músculo. En crecimiento, además, tu cuerpo necesita esa energía.',
    quote: 'a no ser que tengas sobrepeso o que estés ya con mucha panza, no conviene hacer definición.' },
  { id: 'rate', area: 'masa', title: 'Sube despacio', source: 'J048',
    body: 'El ritmo de un volumen limpio es lento. Si subes muy rápido, gana la grasa. Si en dos o tres semanas tu promedio no se mueve, come un poco más.',
    quote: 'Volumen limpio es un superhábit pequeño, controlado, con comida real mínimamente procesada' },
  { id: 'average', area: 'masa', title: 'El promedio, nunca el día', source: 'J007',
    body: 'El peso de un día sube y baja por agua, sal y comida. Lo que importa es el promedio de la semana y la tendencia de varias semanas.',
    quote: 'Y mira el promedio y nunca el día.' },
  { id: 'protein', area: 'comida', title: 'Proteína en cada comida', source: 'J010',
    body: 'Juanma usa 1.6 a 2.2 gramos de proteína por kilo de peso. Lo importante es el total del día repartido en tus comidas: huevo, pollo, carne, pescado, frijoles, yogur, leche, queso.',
    quote: 'Junto con eso, come entre 1.6 y 2.2 gramos de proteína por kilogramo de peso corporal.' },
  { id: 'total', area: 'comida', title: 'El total del día pesa más que la hora', source: 'J029',
    body: 'No necesitas un batido a los 30 minutos de entrenar. Cumple la proteína del día y repártela.',
    quote: 'Así que enfócate en ese número total de proteína y en distribuirlo en las comidas que hagas.' },
  { id: 'real', area: 'comida', title: 'Comida real el 90% del tiempo', source: 'J042',
    body: 'Alimentos de uno o pocos ingredientes casi siempre; el 10% para la vida social, sin culpa.',
    quote: 'Busca que el 90% de tu alimentación sean alimentos de un solo ingrediente mínimamente procesados' },
  { id: 'nosupps', area: 'comida', title: 'No necesitas suplementos para empezar', source: 'J036',
    body: 'Comida, entreno y sueño primero. Juanma dice que antes de cualquier suplemento lo consultes con un profesional, y más si eres menor de edad.',
    quote: 'no necesitas suplementos para empezar, no necesitas para empezar.' },
  { id: 'preworkout', area: 'comida', title: 'No entrenes en ayunas', source: 'J029',
    body: 'Algo con carbohidratos y un poco de proteína 30 a 40 minutos antes. Un plátano, pan con huevo, avena.',
    quote: 'Tiene que ser entre media hora y 40 minutos antes.' },
  { id: 'sleep', area: 'sueño', title: 'Nueve horas de cama', source: 'J023',
    body: 'Si eres adolescente, mínimo nueve horas en cama. Elige a qué hora te levantas y resta nueve.',
    quote: 'si eres adolescente, mínimo, mínimo nueve.' },
  { id: 'late', area: 'sueño', title: 'Entreno duro, 3 horas antes de dormir', source: 'J023',
    body: 'Termina el entreno intenso al menos tres horas antes de acostarte. Si se te hizo tarde, solo algo suave.',
    quote: 'Como máximo termina el entrenamiento 3 horas antes de dormir.' },
  { id: 'steps', area: 'sueño', title: 'Pasos como cardio', source: 'J026',
    body: 'Caminar suma sin quitarle recuperación al entreno. Sube de 1,000 en 1,000 hasta tu meta.',
    quote: 'Además que este cardio no tiene techo' },
  { id: 'frog', area: 'mente', title: 'Trágate el sapo', source: 'J006',
    body: 'Lo difícil primero y el celular después. Si vienes del scroll, entrenar se siente imposible: es contraste de dopamina, no flojera.',
    quote: 'a mí me encanta tragarme el sapo y tú también deberías tragarte el sapo, que es hacer la tarea más dura al inicio.' },
  { id: 'hard-days', area: 'mente', title: 'Los días difíciles cuentan', source: 'J025',
    body: 'Un día malo no rompe el proceso. Vuelves mañana.',
    quote: 'Ten en cuenta siempre que los imprevistos, las excepciones, los días duros, los días difíciles también hacen parte de este proceso' },
]

/** Lo que Bambú cambia del método de Juanma para alguien joven que entrena en casa (y, si aplica, juega fútbol). */
export const ADAPTATIONS: { title: string; body: string; football?: boolean }[] = [
  { title: 'Al fallo, pero técnico', body: 'Juanma lleva sus 2 series al fallo. Tú: la primera serie a 1 o 2 repeticiones del fallo y la última hasta que la técnica se rompa. Cuando la forma se rompe, la serie terminó.' },
  { title: 'Sin contar calorías', body: 'Él cuenta calorías; a tu edad eso se vuelve obsesión fácil. Aquí cuentas comidas con proteína y miras el promedio semanal de peso. Si no sube, agregas una comida o un snack de comida real.' },
  { title: 'Sin creatina ni polvos', body: 'Él mismo dice que lo consultes si eres menor y hoy no la toma. Bambú no te la recomienda.' },
  { title: 'El fútbol cuenta como pierna', football: true, body: 'Él entrena pierna dos veces. Con tres días de fútbol, tus piernas ya trabajan: una sesión de pierna a la semana alcanza y el coach la pone lejos de los partidos.' },
  { title: 'En casa, con escaleras', body: 'Él tiene gimnasio. Tú subes de dificultad con variantes (rodillas, normal, paralelas, diamante, declinada) y con la mochila pesada en la báscula.' },
  { title: 'Dolor no es agujeta', body: 'Agujeta: músculo adolorido al día siguiente, se va solo. Dolor: punzante, en una articulación o en el pecho, o mientras haces el ejercicio. Con dolor se para y se avisa a un adulto.' },
]
