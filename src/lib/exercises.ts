/**
 * Catálogo de ejercicios en casa, ordenado en escaleras de progresión.
 *
 * Cada "slot" es un patrón de movimiento. Dentro de cada slot los ejercicios van del más
 * fácil al más difícil: cuando dominas uno (llegas al tope de repeticiones en tus series),
 * el coach te propone el siguiente escalón o meterle peso con la mochila. Eso es la doble
 * progresión que enseña Juanma: primero más repeticiones, luego más dificultad.
 */
export type Muscle = 'pecho' | 'hombros' | 'triceps' | 'espalda' | 'biceps' | 'antebrazo' | 'cuello' | 'core' | 'cuadriceps' | 'gluteos' | 'isquios' | 'pantorrillas' | 'aductores'
export type Slot = 'empuje' | 'hombro' | 'jalon' | 'jalon_ancho' | 'aduccion' | 'biceps' | 'cuello_flex' | 'cuello_ext' | 'pierna' | 'bisagra' | 'pantorrilla' | 'core' | 'antebrazo_flex' | 'antebrazo_ext' | 'agarre' | 'aductor' | 'nordico'
export type Equipment = 'nada' | 'pared' | 'silla' | 'paralelas' | 'mochila' | 'libros' | 'toalla' | 'puerta' | 'mesa' | 'barra' | 'palo'

export type Exercise = {
  id: string; name: string; slot: Slot; level: number; mode: 'reps' | 'seconds'
  range: [number, number]; muscles: Partial<Record<Muscle, 1 | 0.5>>; equipment: Equipment[]
  /** Series por sesión cuando no son 2 (la dominada en el piso es una sola, al máximo). */
  sets?: number
  cues: string[]; mistakes: string[]; caution?: string; source?: string
}

export const MUSCLES: { id: Muscle; label: string; group: 'torso' | 'pierna' | 'extra'; recoveryHours: number; weekly: [number, number] }[] = [
  { id: 'pecho', label: 'Pecho', group: 'torso', recoveryHours: 48, weekly: [4, 10] },
  // Más series que pecho a propósito: en casa cuesta más llegar al mismo estímulo y la espalda iba atrás.
  { id: 'espalda', label: 'Espalda', group: 'torso', recoveryHours: 48, weekly: [6, 14] },
  { id: 'hombros', label: 'Hombros', group: 'torso', recoveryHours: 48, weekly: [4, 10] },
  { id: 'triceps', label: 'Tríceps', group: 'torso', recoveryHours: 48, weekly: [3, 8] },
  { id: 'biceps', label: 'Bíceps', group: 'torso', recoveryHours: 48, weekly: [3, 8] },
  { id: 'cuello', label: 'Cuello', group: 'extra', recoveryHours: 48, weekly: [4, 8] },
  { id: 'antebrazo', label: 'Antebrazo', group: 'extra', recoveryHours: 36, weekly: [4, 8] },
  { id: 'core', label: 'Abdomen y core', group: 'extra', recoveryHours: 24, weekly: [4, 10] },
  { id: 'cuadriceps', label: 'Cuádriceps', group: 'pierna', recoveryHours: 48, weekly: [4, 10] },
  { id: 'gluteos', label: 'Glúteos', group: 'pierna', recoveryHours: 48, weekly: [4, 10] },
  { id: 'isquios', label: 'Isquios', group: 'pierna', recoveryHours: 48, weekly: [3, 8] },
  { id: 'pantorrillas', label: 'Pantorrillas', group: 'pierna', recoveryHours: 24, weekly: [4, 10] },
  { id: 'aductores', label: 'Aductores (ingle)', group: 'extra', recoveryHours: 48, weekly: [1, 4] },
]

const J004 = 'J004'

export const EXERCISES: Exercise[] = [
  // ── Empuje horizontal: lagartijas ──
  { id: 'pushup-wall', name: 'Lagartija en pared', slot: 'empuje', level: 1, mode: 'reps', range: [12, 20], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5 }, equipment: ['pared'],
    cues: ['Manos a la altura del pecho, un poco más abiertas que los hombros', 'Cuerpo en línea de cabeza a talones', 'Baja hasta que la nariz casi toque la pared'], mistakes: ['Sacar la cadera', 'Bajar solo la cabeza'] },
  { id: 'pushup-incline', name: 'Lagartija inclinada en silla', slot: 'empuje', level: 2, mode: 'reps', range: [8, 15], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5 }, equipment: ['silla'],
    cues: ['Silla contra la pared para que no se mueva', 'Pecho al borde del asiento', 'Codos a 45 grados del cuerpo, no abiertos en T'], mistakes: ['Silla suelta', 'Cadera caída'] },
  { id: 'pushup-knee', name: 'Lagartija con rodillas', slot: 'empuje', level: 3, mode: 'reps', range: [8, 15], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5 }, equipment: ['nada'],
    cues: ['Línea recta de rodillas a cabeza', 'Pecho al piso, no la frente', 'Aprieta glúteos y abdomen'], mistakes: ['Cadera hacia atrás (eso ya no es lagartija)', 'Medio rango'] },
  { id: 'pushup', name: 'Lagartija normal', slot: 'empuje', level: 4, mode: 'reps', range: [8, 15], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5, core: 0.5 }, equipment: ['nada'],
    cues: ['Manos bajo los hombros, dedos al frente', 'Baja controlado en 2 segundos', 'Pecho a un puño del piso, sube explosivo'], mistakes: ['Codos abiertos en T: castiga el hombro', 'Cadera arriba o caída', 'Rebotar abajo'] },
  { id: 'pushup-parallettes', name: 'Lagartija en mini paralelas', slot: 'empuje', level: 5, mode: 'reps', range: [8, 15], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5, core: 0.5 }, equipment: ['paralelas'],
    cues: ['Las paralelas te dejan bajar más: ese rango extra es el estímulo', 'Baja hasta que el pecho pase las manos, sin dolor de hombro', 'Muñecas rectas, agarre firme'], mistakes: ['Bajar más de lo que tu hombro aguanta', 'Hombros encogidos a las orejas'],
    caution: 'Si el frente del hombro molesta abajo, recorta un poco el rango.' },
  { id: 'pushup-diamond', name: 'Lagartija diamante', slot: 'empuje', level: 6, mode: 'reps', range: [6, 12], muscles: { triceps: 1, pecho: 1, hombros: 0.5 }, equipment: ['nada'],
    cues: ['Índices y pulgares forman un diamante bajo el pecho', 'Codos pegados al cuerpo', 'Más tríceps, menos pecho'], mistakes: ['Codos hacia afuera'] },
  { id: 'pushup-decline', name: 'Lagartija declinada (pies en silla)', slot: 'empuje', level: 7, mode: 'reps', range: [6, 12], muscles: { pecho: 1, hombros: 1, triceps: 0.5 }, equipment: ['silla'],
    cues: ['Pies arriba en la silla, manos en el piso o en las paralelas', 'Más peso en las manos: más difícil', 'Mismo cuerpo en tabla'], mistakes: ['Cadera colgando'] },
  { id: 'pushup-backpack', name: 'Lagartija con mochila', slot: 'empuje', level: 8, mode: 'reps', range: [6, 12], muscles: { pecho: 1, triceps: 0.5, hombros: 0.5, core: 0.5 }, equipment: ['mochila', 'paralelas'],
    cues: ['Mochila con libros bien apretada en la espalda alta', 'Pesa la mochila en la báscula y anota los kilos', 'Sube los kilos poco a poco'], mistakes: ['Mochila suelta que se resbala al cuello'] },
  // ── Empuje vertical ──
  { id: 'pike', name: 'Lagartija pica (pike)', slot: 'hombro', level: 1, mode: 'reps', range: [6, 12], muscles: { hombros: 1, triceps: 0.5 }, equipment: ['nada'],
    cues: ['Empieza en lagartija y camina con los pies hacia las manos hasta que la cadera quede arriba: tu cuerpo es una V al revés', 'Manos al ancho de hombros, dedos abiertos, piernas lo más rectas que puedas', 'Dobla los codos hacia atrás (no hacia los lados) y baja la cabeza a un punto un poco adelante de las manos: manos y cabeza forman un triángulo', 'Toca el piso con la frente o casi, y empuja el piso lejos hasta estirar los brazos'], mistakes: ['Convertirla en lagartija normal bajando la cadera', 'Abrir los codos como alas', 'Bajar la cabeza entre las manos en vez de adelante'] },
  { id: 'pike-elevated', name: 'Pike con pies en silla', slot: 'hombro', level: 2, mode: 'reps', range: [6, 12], muscles: { hombros: 1, triceps: 0.5 }, equipment: ['silla'],
    cues: ['Silla pegada a la pared para que no se mueva; pies (o rodillas, más fácil) arriba de la silla', 'Camina con las manos hacia la silla hasta que la cadera quede casi sobre los hombros', 'Baja lento, en 2 o 3 segundos, con la cabeza un poco adelante de las manos', 'Empuja hasta estirar los brazos sin perder la cadera alta'], mistakes: ['Silla que se resbala', 'Manos demasiado lejos de la silla: se vuelve lagartija declinada'] },
  { id: 'pike-parallettes', name: 'Pike en mini paralelas', slot: 'hombro', level: 3, mode: 'reps', range: [6, 12], muscles: { hombros: 1, triceps: 0.5 }, equipment: ['paralelas', 'silla'],
    cues: ['Igual que el pike con pies en silla, pero con las manos en las mini paralelas', 'Como las manos quedan más altas, la cabeza baja más abajo que las manos: ese es el rango extra', 'Bajada de 3 segundos, codos hacia atrás', 'Si no llegas abajo con buena técnica, regresa al escalón anterior'], mistakes: ['Bajar de golpe', 'Paralelas que se deslizan: ponlas sobre un tapete'] },
  // ── Espalda sin barra: los tres movimientos (idea de Seba Galex, ver BACK_METHOD en science.ts) ──
  // Grosor: jalar hacia atrás con los brazos abiertos, juntando los omóplatos.
  { id: 'row-backpack', name: 'Remo inclinado abierto con mochila', slot: 'jalon', level: 1, mode: 'reps', range: [10, 15], muscles: { espalda: 1, hombros: 0.5, biceps: 0.5 }, equipment: ['mochila'],
    cues: ['Rodillas un poco dobladas, torso inclinado casi paralelo al piso, espalda recta', 'Agarra la mochila de las dos asas, manos más abiertas que los hombros', 'Jala con los codos abiertos hacia afuera y junta los omóplatos arriba 1 segundo', 'Baja en 2 o 3 segundos'], mistakes: ['Espalda redonda', 'Subir con impulso de la cadera', 'Codos pegados: eso ya es otro movimiento'] },
  { id: 'row-table', name: 'Remo bajo mesa', slot: 'jalon', level: 2, mode: 'reps', range: [10, 15], muscles: { espalda: 1, biceps: 0.5, core: 0.5 }, equipment: ['mesa'],
    cues: ['Acostado bajo una mesa muy firme, agarra el borde por encima con las manos abiertas', 'Rodillas dobladas y cuerpo recto de rodillas a cabeza', 'Sube el pecho al borde apretando la espalda arriba', 'Baja lento, contando 2 o 3 segundos'], mistakes: ['Mesa ligera o con patas débiles', 'Llegar con la barbilla y no con el pecho'],
    caution: 'Solo con una mesa pesada y estable. Pruébala primero sin cargar todo tu peso. Si se levanta, que alguien se siente encima o ponle mucho peso; si se mueve, no.' },
  { id: 'row-table-straight', name: 'Remo bajo mesa con piernas rectas', slot: 'jalon', level: 3, mode: 'reps', range: [8, 15], muscles: { espalda: 1, biceps: 0.5, core: 0.5 }, equipment: ['mesa'],
    cues: ['Igual que el remo bajo mesa, pero con las piernas estiradas y los talones en el piso', 'Cuerpo en tabla: aprieta glúteos para que la cadera no cuelgue', 'Pecho al borde y bajada de 3 segundos'], mistakes: ['Cadera caída', 'Bajar de golpe'],
    caution: 'Misma regla de la mesa: pesada, estable y probada antes.' },
  // Ancho: el codo va hacia la cintura, pegado al cuerpo.
  { id: 'row-backpack-1arm', name: 'Remo a una mano con mochila', slot: 'jalon_ancho', level: 1, mode: 'reps', range: [8, 15], muscles: { espalda: 1, biceps: 0.5 }, equipment: ['mochila', 'silla'],
    cues: ['Mano y rodilla del mismo lado apoyadas en la silla, espalda plana', 'Piensa en llevar el codo hacia la cintura, no la mano al pecho', 'Movimiento de péndulo: el brazo se dobla lo menos posible y no empiezas jalando con el bíceps', 'Aprieta la espalda arriba 1 segundo y baja lento. Las repeticiones son por lado'],
    mistakes: ['Girar el torso para subir', 'Doblar todo el brazo: trabaja más el bíceps que la espalda'] },
  // Desde arriba: jalar desde arriba y desde los lados, como una dominada.
  { id: 'floor-towel-pull', name: 'Dominada en el piso con toalla', slot: 'aduccion', level: 1, mode: 'reps', range: [8, 20], sets: 1, muscles: { espalda: 1, biceps: 0.5 }, equipment: ['toalla'],
    cues: ['Boca abajo en un piso liso, con una toalla debajo de la cadera y las piernas', 'Brazos estirados al frente y abiertos, palmas apoyadas en el piso', 'Jala como en una dominada: codos hacia abajo y hacia los lados, y deslízate hacia adelante', 'Una sola serie al final, al máximo de repeticiones. Para más peso, dobla las piernas y sostén la mochila con los pies'],
    mistakes: ['Empujar con los pies en vez de jalar con la espalda', 'Hacerla en tapete o alfombra: la toalla no se desliza'] },
  { id: 'pullup-negative', name: 'Dominada negativa', slot: 'aduccion', level: 2, mode: 'reps', range: [3, 8], muscles: { espalda: 1, biceps: 1, antebrazo: 0.5 }, equipment: ['barra'],
    cues: ['Sube con un brinco o una silla, barbilla arriba de la barra', 'Baja lo más lento que puedas (3 a 5 segundos)'], mistakes: ['Soltarse de golpe abajo'] },
  { id: 'pullup', name: 'Dominada', slot: 'aduccion', level: 3, mode: 'reps', range: [3, 10], muscles: { espalda: 1, biceps: 1, antebrazo: 0.5 }, equipment: ['barra'],
    cues: ['Brazos estirados abajo, barbilla arriba de la barra', 'Pecho hacia la barra, sin balancearte'], mistakes: ['Medio rango', 'Patear para subir'] },
  // ── Bíceps ──
  { id: 'curl-backpack', name: 'Curl con mochila', slot: 'biceps', level: 1, mode: 'reps', range: [10, 15], muscles: { biceps: 1, antebrazo: 0.5 }, equipment: ['mochila'],
    cues: ['Agarra la mochila de las asas con palmas arriba', 'Codos quietos a los lados', 'Baja en 2 segundos'], mistakes: ['Columpiar la espalda'] },
  { id: 'curl-towel', name: 'Curl isométrico con toalla', slot: 'biceps', level: 1, mode: 'seconds', range: [20, 40], muscles: { biceps: 1, antebrazo: 0.5 }, equipment: ['toalla'],
    cues: ['De pie, pisa el centro de una toalla con los dos pies', 'Agarra una punta con cada mano, palmas hacia arriba', 'Codos pegados al cuerpo y doblados a 90 grados, como a mitad de un curl', 'Jala hacia arriba lo más fuerte que puedas sin mover los codos y aguanta respirando'], mistakes: ['Jalar con la espalda o echarte para atrás', 'Separar los codos del cuerpo'] },
  // ── Cuello (método Juanma) ──
  { id: 'neck-curl', name: 'Curl de cuello (flexión)', slot: 'cuello_flex', level: 1, mode: 'reps', range: [10, 20], muscles: { cuello: 1 }, equipment: ['nada'], source: J004,
    cues: ['Boca arriba en la cama con la cabeza fuera del borde', 'Deja caer la cabeza atrás hasta donde tu cuello dé y sube la barbilla al pecho', 'Primero solo con tu peso; cuando pases de 20, pon libros con una toalla en la frente'],
    mistakes: ['Ayudarte con los brazos', 'Hacer un abdominal en vez de mover solo el cuello', 'Dejar caer el peso'],
    caution: 'Calienta 1 a 2 minutos con rotaciones suaves. Bajada controlada siempre. Nunca puentes de cuello.' },
  { id: 'neck-extension', name: 'Extensión de cuello boca abajo', slot: 'cuello_ext', level: 1, mode: 'reps', range: [10, 20], muscles: { cuello: 1 }, equipment: ['nada'], source: J004,
    cues: ['Boca abajo en la cama con la cabeza fuera del borde', 'Baja la cabeza lo más que puedas y súbela lo más que puedas', 'Con peso: libros o mochila sobre la nuca con una toalla'],
    mistakes: ['Ayudarte con la espalda', 'Bajar de golpe'], caution: 'Las manos solo sostienen el peso, no empujan.' },
  // ── Pierna ──
  { id: 'squat', name: 'Sentadilla', slot: 'pierna', level: 1, mode: 'reps', range: [12, 20], muscles: { cuadriceps: 1, gluteos: 1 }, equipment: ['nada'],
    cues: ['Pies al ancho de hombros, puntas un poco afuera', 'Rodillas siguen la dirección de los pies', 'Baja hasta que el muslo pase la paralela si tu cuerpo lo permite'], mistakes: ['Rodillas hacia adentro', 'Talones despegados'] },
  { id: 'squat-backpack', name: 'Sentadilla con mochila', slot: 'pierna', level: 2, mode: 'reps', range: [10, 15], muscles: { cuadriceps: 1, gluteos: 1 }, equipment: ['mochila'],
    cues: ['Mochila al frente abrazada contra el pecho (sentadilla copa)', 'Torso alto, baja controlado'], mistakes: ['Inclinarte de más'] },
  { id: 'lunge', name: 'Zancada hacia atrás', slot: 'pierna', level: 3, mode: 'reps', range: [8, 12], muscles: { cuadriceps: 1, gluteos: 1, isquios: 0.5 }, equipment: ['nada'],
    cues: ['Da un paso largo atrás y baja la rodilla casi al piso', 'Peso en el talón de adelante', 'Repeticiones por pierna'], mistakes: ['Rodilla de adelante que se cae hacia adentro'] },
  { id: 'split-squat', name: 'Sentadilla búlgara', slot: 'pierna', level: 4, mode: 'reps', range: [8, 12], muscles: { cuadriceps: 1, gluteos: 1 }, equipment: ['silla'],
    cues: ['Empeine de atrás sobre la silla', 'Baja recto, la rodilla de atrás hacia el piso', 'Repeticiones por pierna'], mistakes: ['Pie de adelante muy cerca de la silla'] },
  { id: 'split-squat-backpack', name: 'Búlgara con mochila', slot: 'pierna', level: 5, mode: 'reps', range: [8, 12], muscles: { cuadriceps: 1, gluteos: 1 }, equipment: ['silla', 'mochila'],
    cues: ['Igual que la búlgara con la mochila en la espalda o al frente'], mistakes: [] },
  { id: 'glute-bridge', name: 'Puente de glúteo', slot: 'bisagra', level: 1, mode: 'reps', range: [12, 20], muscles: { gluteos: 1, isquios: 0.5 }, equipment: ['nada'],
    cues: ['Boca arriba, rodillas dobladas, talones cerca', 'Sube la cadera apretando glúteos 1 segundo arriba'], mistakes: ['Arquear la espalda baja en vez de usar glúteo'] },
  { id: 'single-bridge', name: 'Puente a una pierna', slot: 'bisagra', level: 2, mode: 'reps', range: [8, 15], muscles: { gluteos: 1, isquios: 0.5 }, equipment: ['nada'],
    cues: ['Una pierna estirada al aire', 'Cadera pareja, no se gira'], mistakes: [] },
  { id: 'rdl-backpack', name: 'Peso muerto rumano con mochila', slot: 'bisagra', level: 3, mode: 'reps', range: [10, 15], muscles: { isquios: 1, gluteos: 1, espalda: 0.5 }, equipment: ['mochila'],
    cues: ['Rodillas apenas dobladas, cadera hacia atrás', 'Espalda recta, mochila pegada a las piernas', 'Baja hasta sentir el estiramiento atrás del muslo'], mistakes: ['Espalda redonda', 'Convertirlo en sentadilla'] },
  { id: 'calf-raise', name: 'Elevación de talones', slot: 'pantorrilla', level: 1, mode: 'reps', range: [12, 25], muscles: { pantorrillas: 1 }, equipment: ['nada'],
    cues: ['En el borde de un escalón para bajar más', 'Arriba aguanta 1 segundo, baja lento'], mistakes: ['Rebotar'] },
  { id: 'calf-raise-single', name: 'Talones a una pierna', slot: 'pantorrilla', level: 2, mode: 'reps', range: [10, 20], muscles: { pantorrillas: 1 }, equipment: ['nada'],
    cues: ['Apóyate con una mano en la pared solo para el equilibrio'], mistakes: [] },
  // ── Core ──
  { id: 'plank', name: 'Plancha', slot: 'core', level: 1, mode: 'seconds', range: [20, 60], muscles: { core: 1 }, equipment: ['nada'],
    cues: ['Antebrazos bajo hombros, cuerpo en línea', 'Aprieta glúteos y mete costillas'], mistakes: ['Cadera caída', 'Aguantar la respiración'] },
  { id: 'dead-bug', name: 'Dead bug', slot: 'core', level: 2, mode: 'reps', range: [8, 15], muscles: { core: 1 }, equipment: ['nada'],
    cues: ['Espalda baja pegada al piso todo el tiempo', 'Brazo y pierna contrarios bajan lento'], mistakes: ['Despegar la espalda'] },
  { id: 'hollow', name: 'Hollow hold', slot: 'core', level: 3, mode: 'seconds', range: [15, 45], muscles: { core: 1 }, equipment: ['nada'],
    cues: ['Boca arriba, pega la espalda baja al piso: no debe caber tu mano debajo', 'Despega hombros y cabeza, brazos estirados junto a las orejas (más fácil: brazos a los lados)', 'Despega las piernas rectas y juntas, a un palmo del piso (más fácil: rodillas dobladas)', 'Forma de plátano y aguanta respirando; si la espalda baja se despega, sube las piernas'], mistakes: ['Arquear la espalda baja', 'Aguantar la respiración'] },
  { id: 'tuck-lsit', name: 'L-sit recogido en paralelas', slot: 'core', level: 4, mode: 'seconds', range: [10, 30], muscles: { core: 1, triceps: 0.5, hombros: 0.5 }, equipment: ['paralelas'],
    cues: ['Siéntate en el piso entre las mini paralelas y agárralas a la altura de la cadera', 'Brazos completamente rectos: empuja hacia abajo y aleja los hombros de las orejas', 'Sube las rodillas al pecho y despega la cadera y los pies del piso', 'Aguanta. Si aún no despegas, empieza con un pie apoyado'], mistakes: ['Hombros encogidos', 'Doblar los codos'] },
  // ── Antebrazo con libros ──
  { id: 'wrist-curl', name: 'Curl de muñeca con libros', slot: 'antebrazo_flex', level: 1, mode: 'reps', range: [12, 20], muscles: { antebrazo: 1 }, equipment: ['libros', 'mochila'],
    cues: ['Antebrazo apoyado en el muslo, palma arriba', 'Solo se mueve la muñeca', 'Mochila o libro sujeto con fuerza'], mistakes: ['Mover el codo'] },
  { id: 'wrist-extension', name: 'Extensión de muñeca', slot: 'antebrazo_ext', level: 1, mode: 'reps', range: [12, 20], muscles: { antebrazo: 1 }, equipment: ['libros', 'mochila'],
    cues: ['Igual pero palma abajo', 'Usa menos peso que en el curl'], mistakes: [] },
  { id: 'backpack-hold', name: 'Agarre sosteniendo la mochila', slot: 'agarre', level: 1, mode: 'seconds', range: [20, 45], muscles: { antebrazo: 1 }, equipment: ['mochila'],
    cues: ['De pie, brazo estirado, aprieta el asa', 'Camina por la casa si quieres'], mistakes: [] },
  { id: 'book-pinch', name: 'Pinza de libros', slot: 'agarre', level: 2, mode: 'seconds', range: [15, 40], muscles: { antebrazo: 1 }, equipment: ['libros'],
    cues: ['Sostén un libro grueso solo con la punta de los dedos y el pulgar'], mistakes: [] },
  // ── Blindaje de futbolista: lo que más baja lesiones de ingle e isquio ──
  { id: 'copenhagen', name: 'Copenhagen corto (rodilla en banco)', slot: 'aductor', level: 1, mode: 'reps', range: [4, 12], muscles: { aductores: 1, core: 0.5 }, equipment: ['silla'], source: 'HAROY',
    cues: ['De lado, antebrazo en el piso con el codo bajo el hombro', 'La pierna de arriba apoyada en la silla desde la rodilla hasta el tobillo', 'Sube la cadera hasta que el cuerpo quede recto y la pierna de abajo toque la silla por debajo', 'Baja en 2 o 3 segundos. Las repeticiones son por lado'],
    mistakes: ['Dejar caer la cadera hacia atrás', 'Rebotar abajo'], caution: 'Si la ingle duele (no solo cansa), para y prueba otro día con menos repeticiones.' },
  { id: 'nordic', name: 'Nórdico de isquios', slot: 'nordico', level: 1, mode: 'reps', range: [3, 8], muscles: { isquios: 1, gluteos: 0.5 }, equipment: ['nada'], source: 'NORDIC',
    cues: ['De rodillas sobre un cojín, con los talones atorados bajo un sillón o que alguien te sostenga los tobillos', 'Cuerpo recto de rodillas a cabeza, glúteos apretados', 'Déjate caer hacia adelante lo más lento que puedas, frenando con los isquios', 'Cuando ya no aguantes, frena con las manos y empújate de regreso arriba'],
    mistakes: ['Doblar la cadera (sentarte hacia atrás)', 'Caer de golpe sin frenar'], caution: 'Los primeros días dejan agujetas fuertes atrás del muslo: empieza con 3 repeticiones lentas. Si te dejan adolorido para jugar, hazlo después del partido en vez de antes.' },
  { id: 'wrist-roller', name: 'Enrollador de muñeca casero', slot: 'agarre', level: 3, mode: 'reps', range: [3, 6], muscles: { antebrazo: 1 }, equipment: ['palo'],
    cues: ['Palo de escoba con una cuerda y una botella de agua colgando', 'Enrolla la cuerda girando las muñecas hasta subir la botella y bájala lento', 'Cada subida y bajada cuenta como una repetición'], mistakes: [] },
]

export const SLOT_LABEL: Record<Slot, string> = {
  empuje: 'Empuje (pecho)', hombro: 'Hombro', jalon: 'Espalda: grosor', jalon_ancho: 'Espalda: ancho', aduccion: 'Espalda: desde arriba', biceps: 'Bíceps', cuello_flex: 'Cuello adelante', cuello_ext: 'Cuello atrás',
  pierna: 'Pierna', bisagra: 'Glúteo e isquio', pantorrilla: 'Pantorrilla', core: 'Core', antebrazo_flex: 'Antebrazo', antebrazo_ext: 'Antebrazo atrás', agarre: 'Agarre',
  aductor: 'Ingle (blindaje)', nordico: 'Isquio (blindaje)',
}

/** Las dos sesiones del método de Juanma (torso y pierna), adaptadas a casa. */
export const TEMPLATES: { id: 'torso' | 'pierna'; name: string; slots: Slot[] }[] = [
  { id: 'torso', name: 'Torso', slots: ['empuje', 'jalon', 'hombro', 'jalon_ancho', 'biceps', 'aduccion', 'cuello_flex', 'cuello_ext'] },
  { id: 'pierna', name: 'Pierna y core', slots: ['pierna', 'bisagra', 'pantorrilla', 'core', 'antebrazo_flex', 'agarre'] },
]
/** Blindaje de futbolista: dos ejercicios con ensayos que bajan lesiones de ingle e isquio. Va en días de fútbol. */
export const SHIELD_SLOTS: Slot[] = ['aductor', 'nordico']

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]))
export function exercise(id: string): Exercise | undefined { return BY_ID.get(id) }
export function ladder(slot: Slot): Exercise[] { return EXERCISES.filter(e => e.slot === slot).sort((a, b) => a.level - b.level) }
export function nextInLadder(id: string): Exercise | undefined {
  const e = exercise(id)
  if (!e) return undefined
  return ladder(e.slot).find(x => x.level > e.level && x.mode === e.mode)
}
export function muscleLabel(id: string): string { return MUSCLES.find(m => m.id === id)?.label ?? id }

/** Lo que más conviene conseguir para entrenar en casa, en orden de impacto. */
export const HOME_GEAR: { name: string; why: string; how: string; unlocks: string }[] = [
  { name: 'Barra de dominadas de puerta', why: 'Ya no es indispensable: tu espalda crece con la rutina sin barra. La barra suma dominadas de verdad y colgarte para el agarre.', how: 'Las de presión o las que se apoyan en el marco, sin tornillos. Revisa que tu marco sea de concreto o madera firme y que la barra diga el peso máximo.', unlocks: 'Dominadas, negativas, colgarte para el agarre, elevaciones de rodillas.' },
  { name: 'Ligas de resistencia', why: 'Baratas y te dan jalones que en casa no existen: face pulls, separaciones y remos.', how: 'Un juego de 3 a 5 ligas de distinta dureza. Se amarran a la manija de la puerta o a la barra.', unlocks: 'Remo con liga, face pull, dominada asistida.' },
  { name: 'Báscula para tu mochila', why: 'Juanma pesa sus libros para aplicar sobrecarga progresiva. Si no sabes cuánto cargas, no sabes si progresas.', how: 'La báscula del baño: pésate con y sin la mochila y resta.', unlocks: 'Saber exactamente cuántos kilos le subes a lagartijas, sentadillas y cuello.' },
  { name: 'Enrollador de muñeca casero', why: 'El mejor ejercicio de antebrazo por casi cero pesos.', how: 'Un palo de escoba, 1.5 metros de cuerda y una botella o garrafón con agua. Ata la cuerda al centro del palo.', unlocks: 'Antebrazos y agarre fuertes.' },
  { name: 'Garrafones o botellas con arena', why: 'Mancuernas improvisadas para curl, remo y sentadilla.', how: 'Un garrafón de 5 litros con agua pesa unos 5 kg. Con arena pesa más.', unlocks: 'Curl, remo a una mano, sentadilla copa.' },
  { name: 'Toalla gruesa', why: 'Juanma la usa para el cuello: hace cómodo poner peso en la frente o la nuca.', how: 'La que ya tienes. En un piso liso también es tu dominada en el piso.', unlocks: 'Cuello con libros, dominada en el piso.' },
]

/** Fotos de referencia (Free Exercise DB, dominio público). `similar` = en qué cambia la versión casera. */
export const IMAGES: Record<string, { similar?: string; photo?: string }> = {
  'pushup-wall': { similar: "Igual, pero con las manos en la pared: más vertical y más fácil." },
  'pushup-incline': {},
  'pushup-knee': { similar: "Igual, pero con las rodillas apoyadas en el piso." },
  'pushup': {},
  'pushup-parallettes': { similar: "Con mini paralelas en vez de mancuernas: bajas más que las manos." },
  'pushup-diamond': {},
  'pushup-decline': {},
  'pushup-backpack': { similar: "Igual, con la mochila bien apretada en la espalda." },
  'row-backpack-1arm': { similar: "Con la mochila en vez de mancuerna y la mano en una silla." },
  'row-backpack': { similar: "Con la mochila de las dos asas y los codos abiertos hacia afuera." },
  'row-table': { similar: "Bajo una mesa muy firme en vez de una barra, con rodillas dobladas." },
  'row-table-straight': { photo: 'row-table', similar: "Bajo una mesa muy firme, con las piernas rectas." },
  'pullup-negative': { similar: "Solo la bajada, lo más lento que puedas." },
  'pullup': {},
  'curl-backpack': { similar: "Con la mochila agarrada de las asas." },
  'neck-curl': { similar: "Empieza sin peso; luego libros con una toalla." },
  'neck-extension': { similar: "Empieza sin peso; luego libros con una toalla." },
  'squat': {},
  'squat-backpack': { similar: "Con la mochila abrazada contra el pecho." },
  'lunge': { similar: "Sin peso, o con la mochila." },
  'split-squat': { similar: "Búlgara: el pie de atrás arriba de una silla." },
  'split-squat-backpack': { similar: "Búlgara con la mochila y el pie de atrás en una silla." },
  'glute-bridge': {},
  'single-bridge': {},
  'rdl-backpack': { similar: "Con la mochila pegada a las piernas." },
  'calf-raise': { similar: "Sin peso, en el borde de un escalón." },
  'calf-raise-single': { similar: "A una pierna, apoyado en la pared." },
  'plank': {},
  'dead-bug': {},
  'wrist-curl': { similar: "Con un libro o la mochila." },
  'wrist-extension': { similar: "Con un libro o la mochila, palma abajo." },
  'backpack-hold': { similar: "Con la mochila en una mano." },
  'book-pinch': { similar: "Con un libro grueso en vez de discos." },
  'wrist-roller': { similar: "Palo de escoba, cuerda y botella de agua." },
}
/**
 * Dibujos técnicos de Bambú: los ejercicios sin foto libre confiable. No son IA: salen de
 * ángulos escritos a mano en scripts/figuras_ejercicios.py, así que la técnica es la de las indicaciones.
 */
export const DRAWN = ['pike', 'pike-elevated', 'pike-parallettes', 'curl-towel', 'hollow', 'tuck-lsit', 'copenhagen', 'nordic', 'floor-towel-pull']
export type ExerciseImage = { start: string; end: string; similar?: string; drawn?: boolean }
export function imageOf(id: string): ExerciseImage | null {
  if (DRAWN.includes(id)) return { start: `ejercicios/${id}-0.svg`, end: `ejercicios/${id}-1.svg`, drawn: true }
  const meta = IMAGES[id]
  const file = meta?.photo ?? id
  return meta ? { start: `ejercicios/${file}-0.jpg`, end: `ejercicios/${file}-1.jpg`, similar: meta.similar } : null
}
