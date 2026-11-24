/**
 * Lo que dice la investigación y cómo lo usa Bambú. Cada regla de session.ts y del blindaje
 * sale de aquí. Solo revistas con revisión por pares o consensos de sociedades médicas.
 */
export type Evidence = { id: string; rule: string; why: string; study: string; url: string }

export const EVIDENCE: Evidence[] = [
  { id: 'stretch-dose', rule: 'Tensión cómoda, sin dolor. Por la noche, 20 s y dos vueltas.',
    why: 'ACSM propone 10 a 30 s y 2 a 4 repeticiones para adultos. Usamos una dosis suave, no una receta pediátrica. Sin rebotes, sin empujar rodillas ni espalda. Si duele, para y avisa a un adulto.',
    study: 'Garber y cols., posición ACSM, Medicine & Science in Sports & Exercise, 2011', url: 'https://pubmed.ncbi.nlm.nih.gov/21694556/' },
  { id: 'stretch-dynamic', rule: 'Antes de entrenar, movilidad dinámica. El estiramiento sostenido va al final.',
    why: 'La revisión encontró más pérdida inmediata de rendimiento con 60 s o más de estiramiento estático por músculo. Entre series solo ofrecemos movilidad fácil y opcional. No demuestra que cada postura prevenga lesiones.',
    study: 'Behm y cols., Applied Physiology, Nutrition, and Metabolism, 2016', url: 'https://pubmed.ncbi.nlm.nih.gov/26642915/' },
  { id: 'fifa11', rule: 'En fútbol, sigue el calentamiento completo de tu entrenador.',
    why: 'FIFA 11+ combina carrera, fuerza y equilibrio. El ensayo en futbolistas de 13 a 17 años encontró menos lesiones. Estirar aductores y cadera no sustituye ese programa ni demuestra por sí solo prevención.',
    study: 'Soligard y cols., BMJ, 2008', url: 'https://www.bmj.com/content/337/bmj.a2469' },
  { id: 'iversen', rule: 'Con poco tiempo, cuida las series de la semana, no los días.',
    why: 'Con 4 series duras por músculo a la semana ya hay progreso. Juntar ejercicios opuestos (empuje con jalón) corta el tiempo casi a la mitad sin perder series. Por eso existe el modo exprés.',
    study: 'Iversen y cols., Sports Medicine, 2021', url: 'https://pubmed.ncbi.nlm.nih.gov/34125411/' },
  { id: 'rest', rule: 'Descansa 90 s en los ejercicios grandes y 60 s en los chicos.',
    why: 'Descansar más de un minuto da un poco más de músculo; pasar de 90 s ya no suma. Más descanso solo te quita tiempo.',
    study: 'Singer y cols., Frontiers in Sports and Active Living, 2024', url: 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full' },
  { id: 'failure', rule: 'La última serie, cerca del fallo técnico. La primera, con 1 o 2 en reserva.',
    why: 'Acercarte al fallo ayuda a crecer; la fuerza sale parecida aunque dejes repeticiones en reserva. Llegar al fallo en todas solo suma cansancio.',
    study: 'Refalo y cols., Sports Medicine, 2023; Robinson y cols., Sports Medicine, 2024', url: 'https://pubmed.ncbi.nlm.nih.gov/36334240/' },
  { id: 'copenhagen', rule: 'Copenhagen en tus días de fútbol.',
    why: 'En un ensayo con 652 futbolistas, el grupo que hizo este ejercicio tuvo 41% menos problemas de ingle en la temporada.',
    study: 'Harøy y cols., British Journal of Sports Medicine, 2019', url: 'https://bjsm.bmj.com/content/53/3/150' },
  { id: 'nordic', rule: 'Nórdico de isquios, pocas repeticiones y lentas.',
    why: 'Los programas con nórdico bajan cerca de la mitad las lesiones de isquio en futbolistas. Es parte del calentamiento FIFA 11+.',
    study: 'van Dyk y cols., British Journal of Sports Medicine, 2019', url: 'https://bjsm.bmj.com/content/53/21/1362' },
  { id: 'youth', rule: 'Técnica antes que carga, siempre.',
    why: 'El entrenamiento de fuerza bien hecho es seguro a tu edad y mejora fuerza, coordinación y resistencia a lesiones. La condición es técnica limpia y subir de a poco.',
    study: 'Consenso internacional de entrenamiento de fuerza en jóvenes, British Journal of Sports Medicine, 2014', url: 'https://bjsm.bmj.com/content/48/7/498' },
  { id: 'warmup', rule: 'Calienta con el mismo ejercicio, no con estiramientos largos.',
    why: 'Una serie ligera del primer ejercicio prepara mejor y en menos tiempo. Los estiramientos largos antes de entrenar no hacen falta si tu meta es fuerza.',
    study: 'Iversen y cols., Sports Medicine, 2021', url: 'https://pubmed.ncbi.nlm.nih.gov/34125411/' },
]

/**
 * Espalda sin barra: idea de Seba Galex ("La rutina que me dio una espalda de anime en casa",
 * YouTube, 16-oct-2026). No es estudio: es método, como Juanma. Bambú toma lo que cuadra con la
 * evidencia y con tu edad, y dice qué deja fuera y por qué.
 */
export const BACK_METHOD = {
  source: 'Seba Galex, video del 16 de octubre de 2026',
  url: 'https://youtu.be/zUs80UyibVc',
  moves: [
    { name: 'Grosor', how: 'Jalar hacia atrás con los brazos abiertos, juntando los omóplatos.', exercise: 'Remo inclinado abierto, remo bajo mesa' },
    { name: 'Ancho', how: 'Llevar el codo hacia la cintura, pegado al cuerpo, sin doblar de más el brazo.', exercise: 'Remo a una mano con mochila' },
    { name: 'Desde arriba', how: 'Jalar desde arriba y desde los lados, como una dominada abierta.', exercise: 'Dominada en el piso con toalla' },
  ],
  kept: [
    'Tu espalda no sabe si cuelgas de una barra o jalas una mochila: entiende de fuerza.',
    'Tres movimientos distintos en vez de un solo remo.',
    'Más series de espalda que de pecho para compensar que en casa no hay máquinas.',
    'Cerca del fallo, o la serie no cuenta. La del piso, una sola y al máximo al final.',
  ],
  dropped: [
    { what: 'Sábana o toalla en la puerta', why: 'El mismo video dice que no: puedes romper la puerta o caerte.' },
    { what: 'Palo de escoba entre dos sillas', why: 'El palo se puede romper con tu peso y las sillas se resbalan. Una caída de espalda no vale el riesgo.' },
    { what: 'Descansar menos para progresar', why: 'Descansar más de un minuto da un poco más de músculo (Singer 2024): acortarlo no te hace crecer más. Bambú progresa con repeticiones, peso en la mochila y bajadas lentas.' },
  ],
}
