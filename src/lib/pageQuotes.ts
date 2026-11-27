/**
 * Citas al pie de cada página, alternadas con los versículos (pageVerses.ts).
 * Regla: solo frases con fuente verificable (obra y capítulo). Nada de citas "atribuidas" de internet.
 * Si una frase es resumen de una idea y no cita textual, la fuente lo dice.
 */
export type PageQuote = { text: string; who: string; source: string }

export const PAGE_QUOTES: Record<string, PageQuote[]> = {
  Hoy: [
    { text: 'Mientras se aplaza, la vida pasa.', who: 'Séneca', source: 'Cartas a Lucilio, 1' },
    { text: 'Muy poco se necesita para vivir feliz.', who: 'Marco Aurelio', source: 'Meditaciones VII, 67' },
    { text: '¡No tengan miedo! Abran de par en par las puertas a Cristo.', who: 'San Juan Pablo II', source: 'Homilía de inicio de pontificado, 1978' },
  ],
  Entrenar: [
    { text: 'Cuando tu mente te dice que ya no puedes, apenas vas al 40%.', who: 'David Goggins', source: 'Su regla del 40%, en Can’t Hurt Me' },
    { text: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto sino un hábito.', who: 'Will Durant', source: 'Resumiendo a Aristóteles, Historia de la filosofía' },
    { text: 'No cuento mis abdominales. Empiezo a contar cuando empieza a doler, porque esas son las que cuentan.', who: 'Muhammad Ali', source: 'Entrevista' },
  ],
  Comida: [
    { text: 'Come comida. No demasiada. Sobre todo plantas.', who: 'Michael Pollan', source: 'In Defense of Food' },
    { text: 'No comas nada que tu bisabuela no reconocería como comida.', who: 'Michael Pollan', source: 'Food Rules, regla 2' },
  ],
  Tareas: [
    { text: 'No es que tengamos poco tiempo, sino que perdemos mucho.', who: 'Séneca', source: 'De la brevedad de la vida, 1' },
    { text: 'Haz lo que debes y está en lo que haces.', who: 'San Josemaría Escrivá', source: 'Camino, 815' },
    { text: 'Haz cada cosa como si fuera la última de tu vida.', who: 'Marco Aurelio', source: 'Meditaciones II, 5' },
  ],
  Noche: [
    { text: 'A la tarde te examinarán en el amor.', who: 'San Juan de la Cruz', source: 'Dichos de luz y amor, 59' },
    { text: 'Cuando se apaga la luz, examino todo mi día y repaso lo que hice y lo que dije.', who: 'Séneca', source: 'Sobre la ira III, 36' },
  ],
  Lectura: [
    { text: 'Toma y lee, toma y lee.', who: 'San Agustín', source: 'Confesiones VIII, 12' },
    { text: 'Que otros se jacten de las páginas que han escrito; a mí me enorgullecen las que he leído.', who: 'Jorge Luis Borges', source: 'Un lector, en Elogio de la sombra' },
    { text: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', who: 'Miguel de Cervantes', source: 'Don Quijote II, 25' },
  ],
  Amigos: [
    { text: 'Eres el promedio de las cinco personas con las que más tiempo pasas.', who: 'Jim Rohn', source: 'Conferencias' },
    { text: 'La amistad nace cuando alguien le dice a otro: ¿Qué? ¿Tú también? Creí que era el único.', who: 'C. S. Lewis', source: 'Los cuatro amores' },
  ],
  Historial: [
    { text: 'No subes al nivel de tus metas. Caes al nivel de tus sistemas.', who: 'James Clear', source: 'Hábitos atómicos' },
    { text: 'Muy poco se necesita para vivir feliz.', who: 'Marco Aurelio', source: 'Meditaciones VII, 67' },
  ],
}
