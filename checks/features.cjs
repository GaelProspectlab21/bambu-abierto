// Pruebas de la lógica pura de Bambú. Sin navegador: transpila src/lib y verifica reglas.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const cache = new Map()
function moduleOf(name) {
  if (name === 'supabase') return { supabase: null, cloudConfigured: false }
  if (cache.has(name)) return cache.get(name)
  const exports = {}; cache.set(name, exports)
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'exports', code)(ref => moduleOf(ref.replace('./', '')), exports)
  return exports
}
const { normalizeData, EMPTY_DATA } = moduleOf('model')
const { streak, progress, backfillDays } = moduleOf('progress')
const { readingSeconds, pauseReading, finishReading } = moduleOf('readingSession')
const { diffRecords, applyRecords, toRecords } = moduleOf('records')
const { bibleProgress, describeRanges, toRanges, nextChapters, TOTAL_CHAPTERS, BOOKS } = moduleOf('bible')
const { progression, todayPlan, muscleStates, massPlan, weekSessions, weightTrend, weekPlan } = moduleOf('coach')
const { exercise, EXERCISES, ladder } = moduleOf('exercises')
const { verdict, summarize } = moduleOf('focusStats')
const { parseNfc, nfcUrl } = moduleOf('nfc')
const { game, levelFor, questsFor } = moduleOf('gamification')
const { dueNotes, dueKinds, schedule, bedtime, noteKey } = moduleOf('reminders')
const { cleanReminders } = moduleOf('model')
const { nfcServerAction } = moduleOf('nfcActions')
const { nextStep } = moduleOf('nextStep')
const { broteSays } = moduleOf('brote')
const { talloSays } = moduleOf('tallo')
const { photoSummary } = moduleOf('photoSummary')
const { resolveTheme } = moduleOf('theme')
const { localGuess, buildBlock, snapBlock, sizeToMinutes, askJev, suggestPick } = moduleOf('assist')
const { verdict: dayVerdict, measures, measureStats, compareDay, bandOf } = moduleOf('measure')
const { votesOn, neverTwice, isRescue, rescueRow, dayTime, voteLine } = moduleOf('identity')
const { parseVerses, formatVerses, addVerseMark } = moduleOf('verses')
const { currentForSlot } = moduleOf('coach')
const { stepsOf, totalSeconds, stretchRow, isStretch, stretchStreak, stretchedOn, stretchSlot } = moduleOf('stretch')
const passed = []
const ok = (name) => passed.push(name)

{
  const { pauseHistory } = moduleOf('pauseHistory')
  const actions = [
    ['2026-11-11','youtube · resistida'], ['2026-11-11','youtube · resistida'],
    ['2026-11-24','instagram · resistida'], ['2026-11-24','youtube · pase 10 min'],
    ['2026-11-24','youtube · pase 99 min'], ['2026-11-10','youtube · pase 15 min'],
    ['2026-11-25','youtube · resistida'],
  ].map(([day,note],i) => ({ id:`p${i}`, day, kind:'other', note:`Pausa: ${note}` }))
  const p = pauseHistory(normalizeData({ ...EMPTY_DATA, activities:actions }), '2026-11-24')
  assert.equal(p.days.length, 14)
  assert.equal(p.days[0].day, '2026-11-11')
  assert.equal(p.days[13].day, '2026-11-24')
  assert.equal(p.passMinutes, 10, 'only supported passes inside the window')
  assert.equal(p.resisted, 3)
  assert.equal(p.best.day, '2026-11-11')
  const empty = pauseHistory(EMPTY_DATA, '2026-03-01')
  assert.equal(empty.days[0].day, '2026-02-16')
  assert.equal(empty.best, null)
  assert.equal(empty.passMinutes, 0)
  ok('v8 historial de pausa: ventana inclusiva, pases válidos, mejor día y vacío')
}

{
  const { oauthErrorUrl, googleProviderEnabled, googleIdentityLinked } = moduleOf('oauth')
  for (const href of ['https://b.test/?error_description=denied&error=x&ir=ajustes', 'https://b.test/?ir=ajustes#error_description=denied&error_code=bad']) {
    assert.deepEqual(oauthErrorUrl(href), { error: true, cleanHref: '/?ir=ajustes' })
  }
  assert.deepEqual(oauthErrorUrl('https://b.test/?code=good#section'), { error: false, cleanHref: '/?code=good#section' })
  assert.deepEqual(oauthErrorUrl('https://b.test/?error_description=%3Cscript%3E#section'), { error: true, cleanHref: '/#section' })
  for (const s of [null, {}, { external: null }, { external: { google: 'true' } }, { external: { google: false } }]) assert.equal(googleProviderEnabled(s), false)
  assert.equal(googleProviderEnabled({ external: { google: true } }), true)
  assert.equal(googleIdentityLinked([{ provider: 'email' }]), false)
  assert.equal(googleIdentityLinked([{ provider: 'email' }, { provider: 'google' }]), true)
  ok('v8 Google: proveedor activo, identidades y limpieza de errores sin perder callbacks válidos')
}

{
  const { healthyProgress } = moduleOf('healthyProgress')
  const d = normalizeData({ ...EMPTY_DATA, reading: [
    { id: 'a', day: '2026-11-01', minutes: 5 }, { id: 'b', day: '2026-11-01', minutes: 5 },
    { id: 'c', day: '2026-11-02', minutes: 5 }, { id: 'e', day: '2026-11-03', minutes: 5, estimated: true },
    { id: 'future', day: '2026-11-25', minutes: 5 }],
    sets: [18,18,17,25].map((n,i) => ({ id: `s${i}`, at: 1000 + i, day: `2026-11-${n}`, exercise: 'pushup', reps: 5, rir: 2 })) })
  const p = healthyProgress(d, '2026-11-24')
  assert.equal(p.reading.total, 2)
  assert.equal(p.reading.best, 2)
  assert.equal(p.reading.current, 0, 'a gap does not erase the historical total')
  assert.equal(p.strengthDays, 1, 'unique days within seven days, never future sets')
  assert.equal(p.votes, 0)
  ok('v8 progreso sano: conserva historia, fuerza por día y ningún premio inventado')
}

{
  const { onboardingResult } = moduleOf('onboarding')
  const mods = { reading: false, bible: true, training: true, focus: false, food: false }
  const skipped = onboardingResult('  Ana  ', 13, mods, 'agua', false)
  assert.deepEqual(skipped.firstVotes, [], 'skipping is not a recorded achievement')
  assert.equal(skipped.name, 'Ana')
  assert.equal(skipped.age, 13)
  assert.equal(skipped.modules.reading, true)
  assert.equal(skipped.trainingLevel, 1)
  const done = onboardingResult('Ana', 14, mods, 'gratitud', true)
  assert.deepEqual(done.firstVotes, ['gratitud'])
  assert.deepEqual(done.habits.map(h => h.id), done.firstVotes)
  assert.equal(mods.reading, false)
  ok('v8 bienvenida: solo hechos confirmados, edad y nivel inicial')
}

{
  const { soundAllowed, SOUND_NOTES } = moduleOf('sounds')
  for (const preference of [null, '0', 'garbage']) assert.equal(soundAllowed(preference, false, false, false), false)
  assert.equal(soundAllowed('1', false, false, false), true)
  for (const flags of [[true,false,false], [false,true,false], [false,false,true]]) assert.equal(soundAllowed('1', ...flags), false)
  assert.deepEqual(Object.keys(SOUND_NOTES), ['tap','complete','streak','level','error'])
  assert.equal(new Set(Object.values(SOUND_NOTES).map(x => x.join(','))).size, 5)
  ok('v8 sonido: consentimiento, interrupciones y cinco motivos')
}

// Rachas y lectura
const today = '2026-11-04'
assert.equal(streak(['2026-11-01', '2026-11-02', '2026-11-03'], today).current, 3)
assert.equal(streak(['2026-11-01', '2026-11-02'], today).current, 0)
assert.equal(streak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01').current, 3)
const session = { id: 'test', day: today, startedAt: 1000, title: 'Libro', location: '1 a 3' }
const paused = pauseReading(session, 61000)
assert.equal(readingSeconds(paused, 90000), 60)
assert.equal(readingSeconds(finishReading(pauseReading(paused, 121000), 181000), 999000), 120)
const estimates = normalizeData({ ...EMPTY_DATA, reading: [{ id: 'e', day: today, minutes: 20, note: '', estimated: true }] })
assert.equal(progress(estimates, today).reading.current, 0)
const confirmed = normalizeData({ ...EMPTY_DATA, reading: [{ id: 'c1', day: '2026-11-03', minutes: 20, note: '', estimated: true, dayConfirmed: true }, { id: 'c2', day: today, minutes: 20, note: '', estimated: true, dayConfirmed: true }] })
assert.equal(progress(confirmed, today).reading.current, 2)
ok('rachas, pausa de lectura y estimaciones fuera')

// Modelo: un respaldo v2 viejo abre sin perder nada y llena lo nuevo con valores por omisión
const v2 = { version: 2, profile: { name: 'Gael', onboardingComplete: true }, habits: { [today]: ['bible'] }, reading: [{ id: 'r', day: today, minutes: 0, seconds: 30, note: 'Nota', title: 'Libro' }], training: [], focus: [{ id: 'cauce:1', day: today, task: 'Grabar', minutes: 45, result: 'listo', source: 'cauce', status: 'completed' }], activeFocus: null, tasks: [{ id: 't', text: 'Tarea', status: 'pending', minutes: 25, level: 2.3, updatedAt: 1 }] }
const opened = normalizeData(v2)
assert.equal(opened.reading[0].seconds, 30)
assert.equal(opened.focus[0].task, 'Grabar')
assert.equal(opened.settings.footballDays.length, 3)
assert.deepEqual(opened.sets, [])
assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(opened))), opened)
ok('respaldo v2 abre en v3 y el viaje de ida y vuelta no cambia nada')

// Compartir: perfiles nuevos genéricos, respaldo histórico intacto y texto local sin identidad fija.
{
  const generic = normalizeData({})
  assert.equal(generic.settings.weeklyFocusGoal, 0)
  assert.deepEqual(generic.settings.footballDays, [])
  assert.ok(!generic.settings.habits.some(h => h.id === 'prospect'))
  const custom = normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, weeklyFocusGoal: 540, footballDays: [1, 2, 4], age: 13 } })
  assert.equal(custom.settings.weeklyFocusGoal, 540)
  assert.deepEqual(custom.settings.footballDays, [1, 2, 4])
  assert.equal(custom.settings.age, 13)
  assert.equal(opened.settings.weeklyFocusGoal, 540)
  assert.ok(opened.settings.habits.some(h => h.id === 'prospect'))
  const time = new Date('2026-11-05T12:00:00').getTime()
  assert.notEqual(todayPlan(generic, time).kind, 'futbol')
  const football = { ...generic, settings: { ...generic.settings, footballDays: [4] } }
  assert.match(todayPlan(football, time).reasons[0].text, /dos sesiones/)
  const localText = JSON.stringify([generic.profile, generic.settings, todayPlan(generic, time), progress(generic), broteSays(generic, time), moduleOf('companion').suggestionsFor('Ajustes', generic, time)])
  assert.doesNotMatch(localText, /Gael|00000000-0000-0000-0000-000000000000|tienes 13|13 años|Prospección|PL21/i)
  // Inspecciona texto y literales de las pantallas, no comentarios ni identificadores.
  for (const file of fs.readdirSync(path.join(__dirname, '../src')).filter(file => file.endsWith('.tsx'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = node => {
      if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        assert.doesNotMatch(node.text, /\bGael\b|00000000-0000-0000-0000-000000000000|tienes 13|13 años/i, `Identidad fija en ${file}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  assert.doesNotMatch(moduleOf('reminders').reminderNote('read', generic, time).body, /No la rompas/)
  const disabled = { ...generic, settings: { ...generic.settings, modules: { reading: false, bible: false, training: false, focus: true } } }
  for (const kind of ['read', 'train', 'photos']) assert.equal(moduleOf('reminders').reminderNote(kind, disabled, time), null)
  const tired = { ...generic, settings: { ...generic.settings, sleepTarget: 8 }, activities: [1, 2, 3, 4, 5].map(n => ({ id: String(n), day: moduleOf('coach').shift('2026-11-05', -n), kind: 'football' })) }
  assert.match(todayPlan(tired, time).summary, /8 horas/)
  const { weekPace } = moduleOf('focusStats')
  assert.doesNotMatch(weekPace(0, 0), /atrás|adelante|9 h|de 0/)
  assert.match(weekPace(0, 540, new Date('2026-11-05T12:00:00')), /9 h.*atrás/)
  ok('compartir: defaults genéricos, ajustes históricos intactos y texto local sin identidad fija')
}

// Registros: diff mínimo, borrado como lápida, aplicar reconstruye igual
const base = normalizeData(v2)
const withSet = { ...base, sets: [{ id: 's1', day: today, at: 5, exercise: 'pushup', reps: 12, rir: 1 }] }
let rows = diffRecords(base, withSet, 100)
assert.equal(rows.length, 1)
assert.equal(rows[0].collection, 'set')
const removed = { ...withSet, reading: [] }
rows = diffRecords(withSet, removed, 200)
assert.equal(rows.length, 1)
assert.equal(rows[0].deleted, true)
const habitChange = { ...withSet, habits: { ...withSet.habits, '2026-11-05': ['bible'] } }
rows = diffRecords(withSet, habitChange)
assert.equal(rows.length, 1)
assert.equal(rows[0].collection, 'habit')
const all = toRecords(habitChange)
const rebuilt = applyRecords({ ...EMPTY_DATA }, all)
assert.deepEqual(normalizeData(rebuilt), normalizeData(habitChange))
assert.equal(applyRecords(rebuilt, []), rebuilt)
const tomb = applyRecords(rebuilt, [{ collection: 'set', id: 's1', payload: {}, deleted: true, clientUpdatedAt: 9 }])
assert.equal(tomb.sets.length, 0)
assert.equal(applyRecords(rebuilt, [{ collection: 'set', id: 'x', payload: { day: 'mal' }, deleted: false, clientUpdatedAt: 9 }]).sets.length, 1)
ok('diff por registro, lápidas, reconstrucción exacta y rechazo de basura')

// Biblia
assert.equal(BOOKS.reduce((s, b) => s + b.chapters, 0), TOTAL_CHAPTERS)
const bibleData = { ...EMPTY_DATA, bible: [{ id: '43:1', book: 43, chapter: 1, day: today }, { id: '43:2', book: 43, chapter: 2, day: today }, { id: '43:4', book: 43, chapter: 4, day: today }] }
assert.equal(describeRanges(toRanges(bibleData.bible)), 'Juan 1-2, 4')
assert.deepEqual(nextChapters(bibleData, 'ruta', 2), [{ book: 43, chapter: 3 }, { book: 43, chapter: 5 }])
const bp = bibleProgress(bibleData, 'ruta', today)
assert.equal(bp.read, 3)
assert.ok(bp.finishOn && bp.finishOn > today)
ok('Biblia: 1,189 capítulos, rangos, lo que sigue y proyección')

// Coach: doble progresión
const pushup = exercise('pushup')
const at = (d, h) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
const mk = (id, day, reps, h = 17, ex = 'pushup', rir = 1) => ({ id, day, at: at(day, h), exercise: ex, reps, rir })
const fresh = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], equipment: ['nada', 'pared', 'silla', 'paralelas', 'mochila', 'libros', 'toalla', 'puerta'] } })
assert.equal(progression(fresh, pushup).verdict, 'nuevo')
const growing = { ...fresh, sets: [mk('a', '2026-11-01', 10), mk('b', '2026-11-01', 9)] }
assert.deepEqual(progression(growing, pushup).target, [11, 10])
const top = { ...fresh, sets: [mk('a', '2026-11-01', 15), mk('b', '2026-11-01', 15)] }
const up = progression(top, pushup)
assert.equal(up.verdict, 'subir')
assert.equal(up.next.id, 'pushup-parallettes')
const drop = { ...fresh, sets: [mk('a', '2026-10-30', 14), mk('b', '2026-10-30', 13), mk('c', '2026-11-01', 8), mk('d', '2026-11-01', 7)] }
assert.equal(progression(drop, pushup).verdict, 'fatiga')
const midSession = { ...growing, sets: [...growing.sets, mk('c', today, 11)] }
assert.deepEqual(progression(midSession, pushup, 2, today).target, [11, 10])
ok('doble progresión: nuevo, +1 por serie, subir de escalón y fatiga')

// Coach: plan del día
const wed = '2026-11-04' // miércoles, sin fútbol por omisión (lun, mar, jue)
const planWed = todayPlan(fresh, at(wed, 16))
assert.equal(planWed.kind, 'torso')
assert.equal(planWed.items.length, 8)
assert.ok(planWed.items.some(i => i.slot === 'cuello_flex'))
assert.equal(todayPlan(fresh, at('2026-11-05', 16)).kind, 'futbol')
const pain = { ...fresh, checkins: [{ id: wed, day: wed, pain: 'pecho' }] }
const painPlan = todayPlan(pain, at(wed, 9))
assert.equal(painPlan.kind, 'dolor')
assert.equal(painPlan.items.length, 0)
const torsoYesterday = { ...fresh, sets: ['pushup', 'row-backpack-1arm', 'pike', 'curl-backpack'].flatMap((e, i) => [mk(`t${i}a`, '2026-11-03', 10, 18, e), mk(`t${i}b`, '2026-11-03', 9, 18, e)]) }
const states = muscleStates(torsoYesterday, at(wed, 9))
assert.equal(states.find(s => s.id === 'pecho').status, 'recuperando')
assert.equal(states.find(s => s.id === 'cuadriceps').status, 'pendiente')
assert.notEqual(todayPlan(torsoYesterday, at(wed, 9)).kind, 'torso')
const football = { ...fresh, activities: [{ id: 'f', day: '2026-11-03', kind: 'football', minutes: 90 }] }
assert.equal(muscleStates(football, at(wed, 9)).find(s => s.id === 'cuadriceps').status, 'recuperando')
assert.equal(weekSessions(torsoYesterday, wed).torso, 1)
ok('plan: torso en día libre, fútbol en día de partido, dolor de pecho para todo, recuperación de 48 h y fútbol carga pierna')

// Coach: masa
const body = { ...fresh, body: [...Array.from({ length: 5 }, (_, i) => ({ id: `w${i}`, day: `2026-10-0${i + 1}`, weightKg: 45 })), ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, day: `2026-11-0${i}`.replace('-0', '-0'), weightKg: 45.1 })).filter(b => /^\d{4}-\d{2}-\d{2}$/.test(b.day))] }
const mass = massPlan(normalizeData(body), today)
assert.equal(mass.proteinGrams, 72)
assert.equal(mass.status, 'lento')
ok('masa: proteína 1.6 g/kg y promedio estancado pide comer más')

// Catálogo
assert.ok(EXERCISES.every(e => e.range[0] < e.range[1] && e.cues.length > 0))
assert.ok(ladder('empuje').map(e => e.id).includes('pushup-parallettes'))
assert.equal(new Set(EXERCISES.map(e => e.id)).size, EXERCISES.length)
ok('catálogo: rangos válidos, técnica escrita, ids únicos')

// Enfoque
const week = summarize([{ id: '1', day: '2026-11-02', task: 'x', minutes: 300, result: '', level: 4 }, { id: '2', day: '2026-11-03', task: 'y', minutes: 240, result: '', level: 2 }], '2026-11-02')
assert.equal(week.minutes, 540)
assert.equal(week.highLeverage, 56)
assert.equal(verdict(week, 540, null, 7).signals[0].light, 'verde')
assert.equal(verdict(summarize([], '2026-11-02'), 540, null).title, 'Semana sin bloques')
ok('enfoque: semana, aguja N3-N4 y veredicto')

// NFC
assert.deepEqual(parseNfc('?nfc=reading'), { tag: 'reading' })
assert.deepEqual(parseNfc('?quick=read'), { tag: 'reading' })
assert.deepEqual(parseNfc('?nfc=habit&h=bed'), { tag: 'habit', habit: 'bed' })
assert.equal(parseNfc('?nfc=borrar-todo'), null)
assert.equal(nfcUrl('https://x.app', { tag: 'habit', habit: 'bed' }), 'https://x.app/?nfc=habit&h=bed')
ok('NFC: etiquetas válidas, enlace viejo y rechazo de desconocidas')


// Gamificación
assert.deepEqual(levelFor(0), { level: 1, start: 0, end: 100 })
assert.equal(levelFor(99).level, 1)
assert.equal(levelFor(100).level, 2)
assert.equal(levelFor(219).level, 2)
assert.equal(levelFor(220).level, 3)
assert.equal(levelFor(359).level, 3)
const gd = '2026-11-04'
const full = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true },
  reading: [{ id: 'r', day: gd, minutes: 10, note: '', source: 'bambu' }],
  focus: [{ id: 'f', day: gd, task: 'x', minutes: 30, result: 'ok' }],
  activities: [{ id: 'a', day: gd, kind: 'football', minutes: 60 }],
  checkins: [{ id: gd, day: gd, sleepHours: 9 }], habits: { [gd]: ['bible', 'food', 'speech'] } })
assert.equal(questsFor(full, gd).every(q => q.done), true)
const g1 = game(full, gd)
assert.equal(g1.dayComplete, true)
assert.equal(g1.todayXp, 25 + 10 + 15 + 5 + 15 + 25)
const missing = { ...full, checkins: [] }
assert.equal(game(missing, gd).dayComplete, false)
assert.equal(game(missing, gd).todayXp, 25 + 10 + 15 + 15)
const unconfirmed = normalizeData({ ...EMPTY_DATA, reading: Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, day: `2026-10-2${i}`, minutes: 20, note: '', estimated: true })) })
assert.equal(game(unconfirmed, '2026-10-29').achievements.find(a => a.id === 'read-7').unlocked, false)
const confirmedWeek = { ...unconfirmed, reading: unconfirmed.reading.map(r => ({ ...r, dayConfirmed: true })) }
assert.equal(game(confirmedWeek, '2026-10-29').achievements.find(a => a.id === 'read-7').unlocked, true)
ok('gamificación: niveles crecientes, 5 misiones, bono de día completo y días estimados solo con confirmación')

// Recordatorios: suenan a su hora, solo dentro de la gracia y nunca si ya lo hiciste
const rem = { on: true, checkin: '07:00', read: '20:00', train: '17:30', wake: '06:30', photos: true }
const rdata = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], reminders: rem } })
assert.equal(bedtime(cleanReminders(rem), 9), '21:30')
assert.deepEqual(schedule(cleanReminders(rem), 9).map(x => x.kind), ['photos', 'checkin', 'train', 'read', 'sleep'])
assert.deepEqual(dueKinds(cleanReminders({ ...rem, on: false }), 9, at(wed, 20)), [])
assert.deepEqual(dueNotes(rdata, at(wed, 19)).map(n => n.kind), [])
const at2 = (d, h, m) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()
assert.deepEqual(dueNotes(rdata, at2(wed, 20, 5)).map(n => n.kind), ['read'])
assert.deepEqual(dueNotes(rdata, at2(wed, 21, 31)).map(n => n.kind), ['sleep'])
const readToday = { ...rdata, reading: [{ id: 'x', day: wed, minutes: 6, note: '' }] }
assert.deepEqual(dueNotes(readToday, at2(wed, 20, 5)).map(n => n.kind), [])
assert.equal(dueNotes(rdata, at2(wed, 17, 35))[0].title, 'Hoy toca torso.')
assert.deepEqual(dueNotes(rdata, at2('2026-11-05', 17, 35)).map(n => n.kind), [])
assert.deepEqual(dueNotes({ ...rdata, sets: [mk('s', wed, 10)] }, at2(wed, 17, 35)).map(n => n.kind), [])
assert.deepEqual(dueNotes({ ...rdata, checkins: [{ id: wed, day: wed, pain: 'pecho' }] }, at2(wed, 17, 35)).map(n => n.kind), [])
assert.deepEqual(dueNotes(rdata, at2(wed, 21, 0)).map(n => n.kind), ['read', 'sleep'])
assert.deepEqual(dueNotes(rdata, at2(wed, 6, 31)).map(n => n.kind), ['photos'])
assert.deepEqual(dueNotes({ ...rdata, body: [{ id: wed, day: wed, photos: true }] }, at2(wed, 6, 31)).map(n => n.kind), [])
assert.equal(noteKey('photos', at(wed, 7)), 'photos:2026-11')
assert.equal(noteKey('read', at(wed, 20)), 'read:2026-11-04')
assert.equal(cleanReminders({ read: '25:00', checkin: '' }).read, '20:00')
assert.equal(cleanReminders({ read: '25:00', checkin: '' }).checkin, '')
ok('recordatorios: a su hora, gracia de 90 min, nada si ya leíste o entrenaste, sin entreno en fútbol o dolor, fotos una vez al mes')

// Peso: promedio por semana y franja de volumen limpio
const wt = weightTrend(normalizeData({ ...EMPTY_DATA, body: [
  { id: '2026-10-06', day: '2026-10-06', weightKg: 44 }, { id: '2026-10-07', day: '2026-10-07', weightKg: 46 },
  { id: '2026-11-03', day: '2026-11-03', weightKg: 45.5 }] }), '2026-11-04', 6)
assert.equal(wt.length, 6)
assert.equal(wt[5].end, '2026-11-04')
assert.equal(wt[1].avg, 45)
assert.equal(wt[0].low, null)
assert.equal(wt[1].low, 45)
assert.ok(Math.abs(wt[5].high - 45 * (1 + 0.02 * 28 / 30.4)) < 1e-9)
assert.ok(wt[5].avg > wt[5].low && wt[5].avg < wt[5].high)
assert.equal(wt[2].avg, null)
ok('peso: promedio semanal y franja de +0.5% a +2% al mes')

// Semana: lo pasado es lo que pasó, hoy es el coach, lo que viene respeta fútbol y descansos
const wp = weekPlan({ ...torsoYesterday, activities: [{ id: 'fm', day: '2026-11-02', kind: 'football', minutes: 90 }] }, at(wed, 9))
assert.deepEqual(wp.map(d => d.day), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
assert.deepEqual(wp[0].done, ['futbol'])
assert.deepEqual(wp[1].done, ['torso'])
assert.equal(wp[1].plan, null)
assert.equal(wp[2].isToday, true)
assert.equal(wp[2].plan, todayPlan(torsoYesterday, at(wed, 9)).kind)
assert.equal(wp[3].plan, 'futbol')
for (let i = 1; i < 7; i++) if (wp[i].plan === 'torso') assert.ok(wp[i - 1].plan !== 'torso' && !wp[i - 1].done.includes('torso'), 'torso dos días seguidos')
for (let i = 0; i < 6; i++) if (wp[i].plan === 'pierna') assert.notEqual(wp[i + 1].plan, 'futbol', 'pierna la víspera del fútbol')
const torsos = wp.filter(d => d.plan === 'torso' || d.done.includes('torso')).length
assert.ok(torsos <= 3)
assert.ok(wp.slice(4).some(d => d.plan === 'torso'))
ok('semana: pasado real, hoy del coach, fútbol fijo, sin torso seguido ni pierna antes del partido')

// NFC sin sesión: la etiqueta hace la acción en el servidor con la misma regla de la app
const nd = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
const t0 = at(wed, 20)
let r1 = nfcServerAction(nd, { tag: 'reading' }, t0, wed)
assert.equal(r1.title, 'Lectura iniciada')
assert.equal(r1.next.activeReading.day, wed)
assert.equal(r1.next.activeReading.startedAt, t0)
assert.equal(nfcServerAction(r1.next, { tag: 'reading' }, t0 + 3000, wed).next, r1.next)
const r2 = nfcServerAction(r1.next, { tag: 'reading' }, t0 + 20 * 60000, wed)
assert.equal(r2.title, 'Lectura guardada: 20 min')
assert.equal(r2.next.activeReading.endedAt, t0 + 20 * 60000)
assert.equal(nfcServerAction(r2.next, { tag: 'reading' }, t0 + 30 * 60000, wed).open, true)
const rowsR = diffRecords(nd, r1.next)
assert.deepEqual(rowsR.map(x => `${x.collection}/${x.id}`), ['meta/activeReading'])
const h1 = nfcServerAction(nd, { tag: 'habit', habit: 'food' }, t0, wed)
assert.deepEqual(h1.next.habits[wed], ['food'])
assert.equal(nfcServerAction(h1.next, { tag: 'habit', habit: 'food' }, t0, wed).next, h1.next)
assert.equal(nfcServerAction(nd, { tag: 'habit', habit: 'no-existe' }, t0, wed).next, nd)
const w1 = nfcServerAction(nd, { tag: 'training' }, t0, wed)
assert.equal(w1.next.activeWorkout.startedAt, t0)
const w2 = nfcServerAction({ ...w1.next, sets: [mk('z', wed, 10)] }, { tag: 'training' }, t0 + 40 * 60000, wed)
assert.equal(w2.next.activeWorkout, null)
assert.equal(w2.title, 'Sesión cerrada: 1 serie')
assert.equal(nfcServerAction(nd, { tag: 'focus' }, t0, wed).next, nd)
ok('NFC sin sesión: lectura empieza y para, doble toque ignorado, hábito una vez, entreno abre y cierra, enfoque manda a la app')

// Lo que sigue: la siguiente vuelta según la hora y lo hecho
const ns = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], reminders: { on: true, checkin: '07:00', read: '20:00', train: '17:30', wake: '06:30', photos: true } } })
assert.equal(nextStep(ns, at2(wed, 7, 0)).id, 'checkin')
assert.equal(nextStep({ ...ns, checkins: [{ id: wed, day: wed, sleepHours: 9 }] }, at2(wed, 7, 0)).id, 'read')
assert.equal(nextStep(ns, at2(wed, 5, 0)).id, 'read')
assert.equal(nextStep(ns, at2(wed, 16, 0)).id, 'train')
assert.equal(nextStep(ns, at2('2026-11-05', 16, 0)).id, 'read')
const readW = { ...ns, checkins: [{ id: wed, day: wed, sleepHours: 9 }], reading: [{ id: 'x', day: wed, minutes: 6, note: '' }] }
assert.equal(nextStep(readW, at2(wed, 10, 0)).id, 'focus')
assert.equal(nextStep(readW, at2(wed, 20, 45)).id, 'reflect')
const doneW = { ...readW, checkins: [{ id: wed, day: wed, sleepHours: 9, capacity: 40, given: 40 }] }
assert.equal(nextStep(doneW, at2(wed, 20, 45)).id, 'sleep')
assert.equal(nextStep(ns, at2(wed, 20, 45)).id, 'read')
assert.equal(nextStep(doneW, at2(wed, 23, 10)).title, 'Ya es hora de dormir')
assert.equal(nextStep(doneW, at2(wed, 20, 45)).title, 'A la cama a las 21:30')
const ended = { ...ns, activeReading: { id: 'r', day: wed, startedAt: at(wed, 6), endedAt: at(wed, 7), title: '', location: '' } }
assert.equal(nextStep(ended, at2(wed, 7, 0)).id, 'save-reading')
ok('lo que sigue: lectura sin guardar primero, check-in en la mañana, entreno en la tarde si toca, leer antes de dormir, dormir al final')

// Banda de 14 días para registrar lo olvidado
const bf = backfillDays(normalizeData({ ...EMPTY_DATA, reading: [{ id: 'a', day: '2026-11-04', minutes: 14, seconds: 846, note: '' }, { id: 'b', day: '2026-11-03', minutes: 20, note: '', estimated: true }] }), '2026-11-07')
assert.equal(bf.length, 14)
assert.equal(bf[0].day, '2026-10-25')
assert.equal(bf[13].day, '2026-11-07')
assert.equal(bf[13].isToday, true)
assert.deepEqual([bf[10].read, bf[10].minutes], [true, 14])
assert.equal(bf[9].read, false)
ok('banda de 14 días: hoy al final, minutos reales y estimados sin confirmar no cuentan')

// Navegación de pestañas: flechas, extremos y teclas ajenas.
const { tabDestination } = moduleOf('navigation')
assert.equal(tabDestination('ArrowRight', 2, 3), 0)
assert.equal(tabDestination('ArrowLeft', 0, 3), 2)
assert.equal(tabDestination('ArrowRight', 0, 3), 1)
assert.equal(tabDestination('ArrowLeft', 2, 3), 1)
assert.equal(tabDestination('Home', 2, 3), 0)
assert.equal(tabDestination('End', 0, 3), 2)
assert.equal(tabDestination('Enter', 1, 3), null)
assert.equal(tabDestination('ArrowRight', 0, 0), null)
ok('pestañas: flechas circulares, Home, End y teclas ajenas')
const { elapsedSeconds, timerCues } = moduleOf('exerciseTimer')
assert.equal(elapsedSeconds(1000, 21499), 20)
assert.equal(elapsedSeconds(1000, 21500), 21)
assert.equal(elapsedSeconds(4000, 1000), 0)
assert.deepEqual(timerCues(9, 21, 10, 20), ['minimum', 'target'])
assert.deepEqual(timerCues(21, 22, 10, 20), [])
assert.deepEqual(timerCues(9, 10, 10, 10), ['minimum'])
const timerData = normalizeData({ ...EMPTY_DATA, activeWorkout: { startedAt: 1000, timer: { exercise: 'plank', startedAt: 4000, rir: 1, loadKg: 3 } } })
assert.equal(normalizeData(JSON.parse(JSON.stringify(timerData))).activeWorkout.timer.startedAt, 4000)
assert.equal(timerData.activeWorkout.timer.loadKg, 3)
assert.equal(normalizeData({ ...EMPTY_DATA, activeWorkout: { startedAt: 1000 } }).activeWorkout.timer, undefined)
ok('cronómetro: tiempo real, avisos por cruce y persistencia compatible')

// Auditoría Codex 8-nov: lectura
const { addChapterMarks } = moduleOf('bible')
const { realReading } = moduleOf('progress')
const marked = [{ id: '43:1', book: 43, chapter: 1, day: '2026-11-01', source: 'bambu' }, { id: '43:2', book: 43, chapter: 2, day: '2026-11-01', verses: '1-10' }]
const reread = addChapterMarks(marked, [{ book: 43, chapter: 1 }], '2026-11-05')
assert.equal(reread, marked) // releer no cambia nada ni genera registro
assert.equal(addChapterMarks(marked, [{ book: 43, chapter: 1 }], '2026-10-30').find(m => m.id === '43:1').day, '2026-10-30') // la primera vez gana
const completed = addChapterMarks(marked, [{ book: 43, chapter: 2 }, { book: 43, chapter: 3 }], '2026-11-05')
assert.equal(completed.find(m => m.id === '43:2').verses, undefined)
assert.equal(completed.find(m => m.id === '43:2').day, '2026-11-05')
assert.equal(completed.filter(m => m.id === '43:2').length, 1)
assert.equal(completed.length, 3)
const partials = { ...EMPTY_DATA, bible: Array.from({ length: 10 }, (_, i) => ({ id: `1:${i + 1}`, book: 1, chapter: i + 1, day: gd, verses: '1-3' })) }
assert.equal(bibleProgress(partials, 'ruta', gd).perDay30, 0)
assert.equal(bibleProgress(partials, 'ruta', gd).daysActive30, 1)
assert.equal(game(partials, gd).todayXp, 0)
assert.equal(game({ ...partials, bible: [...partials.bible, { id: '2:1', book: 2, chapter: 1, day: gd }] }, gd).todayXp, 2)
const readSec = (rows) => questsFor(normalizeData({ ...EMPTY_DATA, reading: rows.map((s, i) => ({ id: `q${i}`, day: gd, minutes: Math.floor(s / 60), seconds: s, note: '', source: 'bambu' })) }), gd).find(q => q.id === 'read').done
assert.equal(readSec([299]), false)
assert.equal(readSec([300]), true)
assert.equal(readSec([150, 150]), true)
assert.equal(readSec([30]), false)
assert.equal(streak(normalizeData({ ...EMPTY_DATA, reading: [{ id: 'q', day: gd, minutes: 0, seconds: 30, note: '' }] }).reading.filter(realReading).map(r => r.day), gd).current, 1) // la racha no cambia
ok('lectura: releer conserva la fecha, parciales sin velocidad ni XP de capítulo, misión pide 300 s reales')

// UI/UX 8-nov: etapas del bambú (imagen por etapa, siguiente etapa a la vista)
const { rankOf, rankImage } = moduleOf('gamification')
assert.equal(rankOf(1).name, 'Semilla'); assert.equal(rankOf(3).index, 0); assert.equal(rankOf(4).name, 'Brote')
assert.equal(rankOf(13).name, 'Caña'); assert.equal(rankOf(13).next.name, 'Bambú joven'); assert.equal(rankOf(13).next.level, 16)
assert.equal(rankOf(28).name, 'Bosque antiguo'); assert.equal(rankOf(28).next, null); assert.equal(rankOf(99).index, 9)
assert.equal(rankOf(0).index, 0)
for (let i = 0; i < 10; i++) assert.ok(fs.existsSync(path.join(__dirname, '../public', rankImage(i))), `falta ${rankImage(i)}`)
assert.equal(game(full, gd).rankInfo.name, game(full, gd).rank)
const trainQuest = (acts) => questsFor(normalizeData({ ...EMPTY_DATA, activities: acts }), gd).find(q => q.id === 'train').done
assert.equal(trainQuest([]), false)
assert.equal(trainQuest([{ id: 'w', day: gd, kind: 'walk', minutes: 30 }]), true) // descanso activo cuenta
assert.equal(trainQuest([{ id: 'r', day: gd, kind: 'rest' }]), true)
assert.equal(trainQuest([{ id: 'o', day: gd, kind: 'other' }]), false)
ok('etapas: cada 3 niveles, siguiente etapa con su nivel, las 10 imágenes existen')

// Auditoría Codex 8-nov: sincronización
const { SyncEngine, newerState } = moduleOf('sync')
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true, savedAt: 5 }, { cursor: 2, pending: { a: 1 }, bootstrapped: true, savedAt: 9 }).cursor, 2)
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true, savedAt: 9 }, { cursor: 2, pending: {}, bootstrapped: true, savedAt: 5 }).cursor, 1)
assert.equal(newerState(null, { cursor: 3, pending: {}, bootstrapped: true }).cursor, 3)
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true }, { cursor: 2, pending: {}, bootstrapped: true, savedAt: 1 }).cursor, 2) // la copia sin sello pierde
ok('cola: entre IndexedDB y el espejo gana la copia más nueva')

global.window = { setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} }
global.document = { hidden: false, addEventListener: () => {}, removeEventListener: () => {} }
const remote = { collection: 'task', id: 't1', payload: { id: 't1' }, deleted: false, client_updated_at: 50, seq: 7 }
function fakeClient({ pushFails = false, rows = [remote] } = {}) {
  // Latencia real (macrotarea): sin ella todo se resuelve en microtareas y las carreras no se ven.
  const net = (value) => new Promise(r => setTimeout(() => r(value), 3))
  const query = { select: () => query, eq: () => query, gt: () => query, order: () => query, limit: () => query, abortSignal: () => net({ data: rows, error: null }) }
  return { from: () => query, rpc: () => ({ abortSignal: () => net(pushFails ? { data: null, error: { message: 'red caída' } } : { data: 7, error: null }) }) }
}
async function syncChecks() {
  const quiet = console.warn; console.warn = () => {}
  try {
    // 1) Si guardar los datos falla, el cursor NO avanza (si avanzara, esas filas no volverían a bajar).
    const saved = []
    const store = { load: async () => null, save: async s => { saved.push(JSON.parse(JSON.stringify(s))) } }
    const failing = new SyncEngine({ client: fakeClient(), userId: 'u', store, onRemote: async () => { throw new Error('disco lleno') }, onStatus: () => {} })
    assert.equal(await failing.sync(), false)
    assert.equal(saved.every(s => s.cursor === 0), true)
    // 2) Con éxito, el cursor se guarda DESPUÉS de que los datos quedaron guardados.
    const events = []
    const store2 = { load: async () => null, save: async s => { events.push(`cursor:${s.cursor}`) } }
    const good = new SyncEngine({ client: fakeClient(), userId: 'u', store: store2, onRemote: async () => { await new Promise(r => setTimeout(r, 5)); events.push('datos') }, onStatus: () => {} })
    assert.equal(await good.sync(), true)
    assert.deepEqual(events.slice(-2), ['datos', 'cursor:7'])
    // 3) Una subida fallida resuelve false y conserva lo pendiente (el refresco por versión no debe seguir).
    const pend = new SyncEngine({ client: fakeClient({ pushFails: true }), userId: 'u', store: { load: async () => null, save: async () => {} }, onRemote: async () => {}, onStatus: () => {} })
    pend.track([{ collection: 'task', id: 't1', payload: { id: 't1' }, deleted: false, clientUpdatedAt: 99 }])
    assert.equal(await pend.syncNow(), false)
    assert.equal(pend.pendingCount(), 1)
    // 4) Lo que baja y es más viejo que lo pendiente no pisa lo local.
    assert.equal(pend.keepNewer([{ collection: 'task', id: 't1', payload: {}, deleted: false, clientUpdatedAt: 50 }]).length, 0)
    assert.equal(pend.keepNewer([{ collection: 'task', id: 't1', payload: {}, deleted: false, clientUpdatedAt: 120 }]).length, 1)
    // 5) syncNow espera la vuelta en curso y hace una propia (antes sync() devolvía sin subir nada).
    //    La vuelta en curso ya tomó su mochila vacía; el cambio que llega después debe estar subido al resolver.
    const slow = new SyncEngine({ client: fakeClient({ rows: [] }), userId: 'u', store: { load: async () => null, save: async () => {} }, onRemote: async () => {}, onStatus: () => {} })
    const first = slow.sync()
    slow.track([{ collection: 'task', id: 't2', payload: { id: 't2' }, deleted: false, clientUpdatedAt: 99 }])
    assert.equal(await slow.syncNow(), true)
    assert.equal(slow.pendingCount(), 0)
    await first
  } finally { console.warn = quiet }
  ok('sincronización: datos antes que cursor, resultado explícito y refresco sin pisar lo pendiente')
}
const { binauralWav, AUDIO_PRESETS, LOOP_SECONDS } = moduleOf('binaural')
assert.deepEqual(AUDIO_PRESETS.map(p => [p.name, p.beat]), [['Leer', 10], ['Calma', 6], ['Enfoque', 14]])
assert.ok(LOOP_SECONDS >= 30 && LOOP_SECONDS <= 60)
for (const beat of [6, 10, 14]) {
  const wav = binauralWav(beat), v = new DataView(wav)
  assert.equal(Buffer.from(wav).toString('ascii', 0, 4), 'RIFF')
  assert.equal(Buffer.from(wav).toString('ascii', 8, 12), 'WAVE')
  assert.equal(v.getUint16(22, true), 2)
  assert.equal(v.getUint32(24, true), 44100)
  assert.equal(v.getUint32(40, true), wav.byteLength - 44)
  for (let channel = 0; channel < 2; channel++) {
    let crossings = 0
    for (let i = 1; i < 44100 * LOOP_SECONDS; i++) if (v.getInt16(44 + i * 4 + channel * 2, true) > 0 && v.getInt16(44 + (i - 1) * 4 + channel * 2, true) <= 0) crossings++
    assert.equal(crossings, LOOP_SECONDS * (200 + channel * beat))
    assert.equal(v.getInt16(44 + channel * 2, true), 0)
    assert.ok(Math.abs(v.getInt16(wav.byteLength - 4 + channel * 2, true)) < 340)
  }
}
assert.throws(() => binauralWav(99))
ok('WAV: cabecera, estéreo, frecuencias por canal y continuidad del bucle')
// Herencia y semana sólida
{
  const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
  const week = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true },
    reading: [...days, '2026-10-20'].map((day, i) => ({ id: `w${i}`, day, minutes: 10, note: '', source: 'bambu' })),
    focus: days.map((day, i) => ({ id: `wf${i}`, day, task: 'x', minutes: 30, result: 'ok' })),
    checkins: days.map(day => ({ id: day, day, sleepHours: 9 })) })
  const gw = game(week, '2026-11-13')
  assert.equal(gw.heritageXp, 25)
  assert.equal(gw.bambuXp, 5 * 40 + 40)
  assert.equal(gw.week.good, 5)
  assert.equal(gw.week.bonus, true)
  const four = game(week, '2026-11-12')
  assert.equal(four.week.good, 4)
  assert.equal(four.bambuXp, 4 * 40)
  assert.equal(game(week, '2026-11-13').bambuDay, 12)
  ok('gamificación: la historia anterior a Bambú se cuenta aparte y la semana sólida da bono a la quinta')
}
// Brote, Tallo, fotos y tema
{
  const noon = (day, h) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).getTime()
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  // Dolor de pecho: Brote se calma y Tallo manda a descansar con alerta, sin plan de entreno.
  const pain = { ...base, checkins: [{ id: '2026-11-10', day: '2026-11-10', pain: 'pecho' }] }
  assert.equal(broteSays(pain, noon('2026-11-10', 10)).mood, 'calma')
  const t = talloSays(pain, noon('2026-11-10', 10))
  assert.equal(t.pose, 'rest'); assert.equal(t.lines[0].tone, 'alerta')
  // De noche con la lectura hecha: sueño. Mañana sin check-in: feliz con saludo.
  const read = { ...base, reading: [{ id: 'r', day: '2026-11-10', minutes: 10, note: '', source: 'bambu' }] }
  assert.equal(broteSays(read, noon('2026-11-10', 22)).mood, 'sueno')
  assert.match(broteSays(base, noon('2026-11-10', 9)).lines[0], /Buenos días/)
  // Racha en riesgo por la tarde: nombra los días sin culpa.
  const streakData = { ...base, reading: [1, 2, 3].map(n => ({ id: `s${n}`, day: `2026-11-0${n + 6}`, minutes: 10, note: '', source: 'bambu' })) }
  assert.match(broteSays(streakData, noon('2026-11-10', 18)).lines[0], /Llevas 3 días/)
  // Los consejos son los mismos todo el día (no cambian solos).
  assert.deepEqual(broteSays(base, noon('2026-11-10', 9)).lines.slice(1), broteSays(base, noon('2026-11-10', 15)).lines.slice(1))
  // Fotos: 60 días, entrenos y promedio de peso alrededor de cada foto.
  const withBody = { ...base, sets: [{ id: 's', day: '2026-10-20', at: 1, exercise: 'pushup', reps: 10 }],
    body: [{ id: 'a', day: '2026-09-10', weightKg: 44 }, { id: 'b', day: '2026-11-09', weightKg: 46 }] }
  const ps = photoSummary(withBody, '2026-09-10', '2026-11-09')
  assert.equal(ps.days, 60); assert.equal(ps.trainDays, 1); assert.equal(ps.weightFrom, 44); assert.equal(ps.weightTo, 46)
  assert.match(photoSummary(withBody, '2026-11-09', '2026-11-09').lines[0], /mismo día/)
  assert.equal(resolveTheme('auto', true), 'dark'); assert.equal(resolveTheme('claro', true), 'light'); assert.equal(resolveTheme('oscuro', false), 'dark')
  ok('Brote, Tallo, fotos y tema: ánimo por hora y dolor, consejos estables, resumen de datos entre fotos')
}
// La medida del día: capacidad contra entrega
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(dayVerdict(20, 20).kind, 'todo'); assert.match(dayVerdict(20, 20).text, /vale tanto como un día de cien/)
  assert.equal(dayVerdict(80, 76).kind, 'todo'); assert.equal(dayVerdict(80, 70).kind, 'parte'); assert.equal(dayVerdict(40, 60).kind, 'mas')
  // Dar el 100% de un 20% cuenta igual que dar el 100% de un 100%: día sólido y +25 XP sin ninguna misión.
  const dayX = '2026-11-10'
  const low = normalizeData({ ...base, checkins: [{ id: dayX, day: dayX, capacity: 20, given: 20 }] })
  const gl = game(low, dayX)
  assert.equal(gl.gave.today, true); assert.equal(gl.week.good, 1); assert.equal(gl.gave.streak, 1)
  // 25 por dar lo que traías + 5 por registrar el check-in; ninguna misión de producir hace falta
  assert.equal(gl.todayXp, 25 + 5)
  const high = normalizeData({ ...base, checkins: [{ id: dayX, day: dayX, capacity: 100, given: 40 }] })
  assert.equal(game(high, dayX).gave.today, false); assert.equal(game(high, dayX).week.good, 0)
  assert.equal(game(base, dayX).gave.today, null)
  // Sin reflexión no hay dato; pasarse cinco días seguidos activa el aviso de cuidado, no un premio.
  const over = normalizeData({ ...base, checkins: [1, 2, 3, 4, 5].map(n => ({ id: `2026-11-0${n}`, day: `2026-11-0${n}`, capacity: 40, given: 80 })) })
  const st = measureStats(measures(over, '2026-11-05', 14))
  assert.equal(st.counted, 5); assert.equal(st.overGiving, true); assert.equal(st.gaveDays, 5)
  // Módulos: quien no entrena ni enfoca solo tiene lectura, medida y hábitos como misiones.
  const light = normalizeData({ ...base, settings: { ...base.settings, modules: { reading: true, bible: false, training: false, focus: false } } })
  assert.deepEqual(questsFor(light, dayX).map(q => q.id), ['read', 'checkin', 'habits'])
  assert.equal(questsFor(base, dayX).length, 5)
  // Una lista de hábitos vacía es válida (no se rellena con los de otra persona).
  assert.equal(normalizeData({ ...base, settings: { ...base.settings, habits: [] } }).settings.habits.length, 0)
  // El dolor de pecho de anoche sigue bloqueando el plan de hoy.
  const nightPain = normalizeData({ ...base, checkins: [{ id: '2026-11-09', day: '2026-11-09', pain: 'pecho' }] })
  assert.equal(todayPlan(nightPain, new Date('2026-11-10T10:00:00').getTime()).kind, 'dolor')
  ok('medida del día: capacidad contra entrega, día sólido con poco, aviso de dar de más, módulos y dolor de anoche')
}
// Comparadores de la noche
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(bandOf(40), 'bajo'); assert.equal(bandOf(60), 'medio'); assert.equal(bandOf(80), 'alto')
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
  const data = normalizeData({ ...base,
    checkins: [{ id: days[0], day: days[0], capacity: 100, sleepHours: 8.5 }, { id: days[1], day: days[1], capacity: 90, sleepHours: 8.5 }, { id: days[2], day: days[2], capacity: 20, sleepHours: 6 }, { id: days[3], day: days[3], capacity: 20, sleepHours: 6 }, { id: '2026-11-05', day: '2026-11-05', capacity: 100, sleepHours: 6 }],
    reading: [{ id: 'a', day: days[0], minutes: 30, note: '' }, { id: 'b', day: days[1], minutes: 20, note: '' }, { id: 'c', day: days[2], minutes: 5, note: '' }, { id: 'd', day: days[3], minutes: 5, note: '' }, { id: 'e', day: '2026-11-05', minutes: 6, note: '' }],
    focus: [{ id: 'f1', day: days[0], task: 'x', minutes: 60, result: 'ok' }, { id: 'f2', day: days[1], task: 'x', minutes: 40, result: 'ok' }] })
  const c = compareDay(data, '2026-11-05', 100)
  assert.equal(c.todayBand, 'alto'); assert.equal(c.enough, true)
  assert.equal(c.rows.find(r => r.band === 'alto').avg.readMin, 25)
  assert.equal(c.rows.find(r => r.band === 'bajo').avg.readMin, 5)
  assert.equal(c.today.readMin, 6)
  assert.ok(c.lines.some(l => /Cuando traes 80% o más sueles leer 25 min/.test(l)))
  assert.ok(c.lines.some(l => /dormiste 6 h/.test(l)))   // 100% con 6 h cuando tus 100% duermen 8.5
  // Sin días suficientes no inventa referencias.
  assert.equal(compareDay(base, '2026-11-05', 60).enough, false)
  ok('comparadores de la noche: banda por capacidad, promedios reales y duda cuando el sueño no cuadra con el 100%')
}
// NFC de la noche
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.deepEqual(parseNfc('?nfc=night'), { tag: 'night' })
  const open = nfcServerAction(base, { tag: 'night' }, 1, '2026-11-10')
  assert.equal(open.open, true); assert.equal(open.next, base)
  const morning = { ...base, checkins: [{ id: '2026-11-10', day: '2026-11-10', capacity: 40, sleepHours: 8 }] }
  const r = nfcServerAction(morning, { tag: 'night', night: { capacity: 40, given: 38, reflection: '  Leí y entrené ligero ' } }, 1, '2026-11-10')
  const row = r.next.checkins.find(c => c.day === '2026-11-10')
  assert.equal(row.given, 38); assert.equal(row.capacity, 40); assert.equal(row.sleepHours, 8)   // conserva lo de la mañana
  assert.equal(row.reflection, 'Leí y entrené ligero'); assert.match(r.title, /38% de 40%/)
  assert.equal(nfcServerAction(base, { tag: 'night', night: { capacity: 250, given: -5 } }, 1, '2026-11-10').next.checkins[0].capacity, 100)  // acota
  ok('NFC de la noche: sin datos abre la app, con datos registra y conserva el check-in de la mañana, y acota valores')
}
// Bloque desde tareas: Jev propone, tú revisas
(async () => {
  const T = (id, text, o = {}) => ({ id, text, status: 'pending', minutes: 25, level: null, updatedAt: 1, notes: '', project: '', subtasks: [], ...o })
  assert.equal(localGuess(T('a', 'Pagar internet')).level, 1)
  assert.equal(localGuess(T('b', 'Mandar propuesta a un cliente')).level, 4)
  assert.equal(snapBlock(10), 25); assert.equal(snapBlock(25), 25); assert.equal(snapBlock(70), 90); assert.equal(snapBlock(500), 120)
  assert.equal(sizeToMinutes(2.2), 45); assert.equal(sizeToMinutes(9), 120)
  // Varias tareas: un bloque con nombre unido, minutos sumados y redondeados, nivel más alto y cada tarea como mini entregable.
  const tasks = [T('a', 'Responder correos'), T('b', 'Editar video', { minutes: 60 }), T('c', 'Pagar internet', { level: 1 })]
  const guesses = [{ id: 'a', level: 4, size: 1, source: 'jev' }, { id: 'b', level: 3, size: 2, source: 'jev' }, { id: 'c', level: 1, size: 0, source: 'jev' }]
  const b = buildBlock(tasks, guesses)
  assert.equal(b.task, 'Responder correos + Editar video + Pagar internet')
  assert.equal(b.minutes, 120)                    // 25 + 60 (lo fijado por ti manda) + 25 de Jev para pagar = 110, redondeado arriba
  assert.equal(b.level, 4); assert.equal(b.micro.length, 3); assert.equal(b.source, 'jev')
  assert.equal(b.taskIds.join(), 'a,b,c')
  // Lo que ya fijaste tú manda sobre la sugerencia.
  assert.equal(buildBlock([T('x', 'Algo', { level: 2, minutes: 90 })], [{ id: 'x', level: 4, size: 0, source: 'jev' }]).level, 2)
  // Una sola tarea con subtareas: su primera pendiente es la meta y las demás los mini entregables.
  const one = buildBlock([T('s', 'Lanzar campaña', { subtasks: [{ id: '1', text: 'Escribir E1', done: true }, { id: '2', text: 'Escribir E2', done: false }, { id: '3', text: 'Subir a Smartlead', done: false }] })], [])
  assert.equal(one.goal, 'Escribir E2'); assert.equal(one.micro.length, 2); assert.equal(one.source, 'local')
  // Jev caído, lento o sin nube: devuelve null y la app usa la regla local.
  assert.equal(await askJev(tasks, null), null)
  assert.equal(await askJev(tasks, async () => { throw new Error('red') }), null)
  assert.equal(await askJev(tasks, () => new Promise(() => {}), 30), null)
  const ok = await askJev(tasks, async () => ({ data: { items: [{ id: 'a', level: 4, size: 1 }, { id: 'z', level: 9, size: 1 }] }, error: null }))
  assert.equal(ok.length, 1); assert.equal(ok[0].source, 'jev')   // descarta lo fuera de rango
  assert.equal(suggestPick([T('l', 'Pagar internet'), T('h', 'Mandar propuesta a cliente'), T('d', 'Hecha', { status: 'done' })], 2)[0].id, 'h')
  console.log('ok-assist')
})().catch(e => { console.error(e); process.exit(1) })
ok('bloque desde tareas: nivel y tamaño de Jev, regla local de respaldo, suma de minutos y lo fijado por ti manda')
// Sesión a la medida del tiempo (session.ts): exprés, superseries, prioridad, descanso, dedazos y blindaje
{
  const S = moduleOf('session')
  const settings = { restSeconds: 90 }
  const torso = todayPlan(fresh, at(wed, 16))
  const st = muscleStates(fresh, at(wed, 16))
  // Descanso: 90 s en lo grande, 60 en lo chico, 45 en exprés.
  assert.equal(S.restFor(exercise('pushup'), settings), 90)
  assert.equal(S.restFor(exercise('curl-backpack'), settings), 60)
  assert.equal(S.restFor(exercise('pushup'), settings, true), 45)
  // Sin límite va completa; con 15 min entra en exprés, cabe y nunca queda vacía.
  const full = S.fitToTime(torso.items, null, settings, st)
  assert.equal(full.items.length, 8); assert.equal(full.express, false)
  const fast = S.fitToTime(torso.items, 15, settings, st)
  assert.equal(fast.express, true)
  assert.ok(fast.minutes <= 15, `exprés de ${fast.minutes} min`)
  assert.ok(fast.items.length >= 2 && fast.items.length < 8)
  assert.ok(S.fitToTime(torso.items, 1, settings, st).items.length >= 1)
  // Superseries: empuje con jalón juntos, y la cola alterna A1, B1, A2, B2.
  const g = S.groups(torso.items)
  assert.ok(g.some(x => x.length === 2 && x.map(i => i.slot).sort().join() === 'empuje,jalon'))
  const q = S.sessionQueue([g.find(x => x.some(i => i.slot === 'empuje'))])
  assert.deepEqual(q.map(s => `${s.item.slot}${s.set}`), ['empuje1', 'jalon1', 'empuje2', 'jalon2'])
  // Espalda sin barra (video de Seba Galex): grosor, ancho y desde arriba; sin remo en puerta.
  assert.deepEqual(torso.items.filter(i => ['jalon', 'jalon_ancho', 'aduccion'].includes(i.slot)).map(i => i.exercise.id), ['row-backpack', 'row-backpack-1arm', 'floor-towel-pull'])
  assert.equal(torso.items.find(i => i.slot === 'aduccion').sets, 1)             // la del piso: una sola, al máximo
  assert.equal(torso.items.find(i => i.slot === 'aduccion').progression.target.length, 1)
  assert.equal(exercise('row-towel-door'), undefined)
  assert.ok(S.groups(torso.items).some(x => x.map(i => i.slot).sort().join() === 'hombro,jalon_ancho'))
  const withTable = { ...fresh, settings: { ...fresh.settings, equipment: [...fresh.settings.equipment, 'mesa'] }, sets: [mk('t1', '2026-11-01', 15, 17, 'row-backpack'), mk('t2', '2026-11-01', 15, 17, 'row-backpack')] }
  assert.equal(progression(withTable, exercise('row-backpack')).next.id, 'row-table')   // tope en mochila: sube a la mesa
  assert.equal(todayPlan({ ...withTable, sets: [] }, at(wed, 16)).items.find(i => i.slot === 'jalon').exercise.id, 'row-backpack')
  // Cambiar ejercicio: mismo hueco sí; otro movimiento o id inventado, no.
  const swapped = S.applySwaps(torso.items, { jalon: 'row-table', empuje: 'squat', hombro: 'no-existe' }, fresh, wed)
  assert.equal(swapped.find(i => i.slot === 'jalon').exercise.id, 'row-table')
  assert.equal(swapped.find(i => i.slot === 'jalon').progression.verdict, 'nuevo')
  assert.equal(swapped.find(i => i.slot === 'empuje').exercise.id, torso.items.find(i => i.slot === 'empuje').exercise.id)
  assert.equal(swapped.find(i => i.slot === 'hombro').exercise.id, torso.items.find(i => i.slot === 'hombro').exercise.id)
  // Prioridad: si el pecho ya tiene su volumen de la semana, el par de empuje es lo primero que sale.
  const chestDone = { ...fresh, sets: Array.from({ length: 6 }, (_, k) => mk(`p${k}`, '2026-10-31', 12)) }
  const st2 = muscleStates(chestDone, at(wed, 16))
  const fit2 = S.fitToTime(todayPlan(chestDone, at(wed, 16)).items, 12, settings, st2)
  assert.ok(fit2.dropped.some(i => i.slot === 'empuje'), 'el pecho cubierto se recorta primero')
  // La siguiente serie sale de lo registrado hoy: sobrevive a recargar.
  const half = { ...fresh, sets: [mk('x1', wed, 10, 16, torso.items[0].exercise.id)] }
  const cur = S.currentStep(S.sessionQueue(S.groups(torso.items)), half, wed)
  assert.equal(cur.done, 1)
  assert.notEqual(`${cur.step.item.exercise.id}${cur.step.set}`, `${torso.items[0].exercise.id}1`)
  // Dedazos: 5 s de agarre o 60 lagartijas piden confirmar; lo normal pasa.
  assert.ok(S.checkValue(exercise('backpack-hold'), 5))
  assert.ok(S.checkValue(exercise('pushup'), 60))
  assert.equal(S.checkValue(exercise('pushup'), 12), null)
  assert.equal(S.checkValue(exercise('plank'), 45), null)
  // Día de fútbol: blindaje de una serie (Copenhagen y nórdico), y no bloquea la pierna.
  const fb = todayPlan(fresh, at('2026-11-05', 16))
  assert.deepEqual(fb.items.map(i => i.exercise.id), ['copenhagen', 'nordic'])
  assert.ok(fb.items.every(i => i.sets === 1))
  const shield = { ...fresh, sets: [mk('n1', '2026-11-05', 4, 17, 'nordic')] }
  assert.notEqual(muscleStates(shield, at('2026-11-06', 9)).find(s => s.id === 'isquios').status, 'recuperando')
  // Fútbol sin registrar: pregunta hoy desde las 6 pm o ayer, y no repite si ya respondiste.
  const thu6pm = new Date('2026-11-05T19:00:00'), fri = new Date('2026-11-06T09:00:00')
  const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  assert.equal(S.footballToAsk(fresh, thu6pm, () => false, dk), '2026-11-05')
  assert.equal(S.footballToAsk(fresh, fri, () => false, dk), '2026-11-05')
  assert.equal(S.footballToAsk(fresh, fri, () => true, dk), null)
  assert.equal(S.footballToAsk({ ...fresh, activities: [{ id: 'f', day: '2026-11-05', kind: 'football' }] }, fri, () => false, dk), null)
  // Cada dibujo técnico va precargado en el service worker: sin señal la técnica se ve igual.
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8')
  for (const id of moduleOf('exercises').DRAWN) assert.ok(sw.includes(`'${id}'`), `sw.js no precarga ${id}`)
  // Todo ejercicio del catálogo tiene imagen (foto o dibujo) y los dibujos existen en disco.
  const { imageOf: img } = moduleOf('exercises')
  for (const e of EXERCISES) {
    const i = img(e.id)
    assert.ok(i, `${e.id} sin imagen`)
    for (const f of [i.start, i.end]) assert.ok(fs.existsSync(path.join(__dirname, '../public', f)), `falta ${f}`)
  }
}
ok('sesión a tu tiempo: exprés cabe, superseries alternan, se recorta lo cubierto, dedazos, blindaje de fútbol e imágenes completas')

// La vara (vara.ts): promesas que se marcan solas, preguntas de conducta y cabeza contra hechos
{
  const V = moduleOf('vara')
  const d = '2026-11-12'
  assert.deepEqual([20, 40, 60, 79, 80, 100].map(V.promiseCount), [1, 1, 2, 2, 3, 3])
  const tasks = [{ id: 'hi', text: 'Mandar propuesta', status: 'pending', minutes: 30, level: 4, updatedAt: 1 }, { id: 'lo', text: 'Ordenar', status: 'pending', minutes: 10, level: 1, updatedAt: 1 }]
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, tasks })
  const sug = V.suggestPromises(base, 40)
  assert.equal(sug[0].ref, 'hi')                                   // la tarea de más palanca va primero
  assert.equal(sug.find(p => p.kind === 'reading').target, 5)     // con poca capacidad, la meta es chica
  assert.equal(V.suggestPromises(base, 100).find(p => p.kind === 'reading').target, 25)
  // Se marcan solas con los registros del día (y solo de ese día).
  const done = normalizeData({ ...base,
    reading: [{ id: 'r', day: d, minutes: 0, seconds: 16 * 60, note: '' }, { id: 'r2', day: '2026-11-11', minutes: 60, note: '' }],
    sets: Array.from({ length: 8 }, (_, k) => ({ id: `s${k}`, day: d, at: 1 + k, exercise: 'pushup', reps: 10 })),
    focus: [{ id: 'f', day: d, task: 'x', minutes: 45, result: '' }],
    tasks: [{ ...tasks[0], status: 'done', completedOn: d }, tasks[1]], habits: { [d]: ['speech'] } })
  const P = (kind, extra = {}) => ({ id: kind, kind, label: kind, ...extra })
  assert.equal(V.promiseKept(P('reading', { target: 15 }), done, d), true)
  assert.equal(V.promiseKept(P('reading', { target: 25 }), done, d), false)
  assert.equal(V.promiseKept(P('reading', { target: 15 }), done, '2026-11-13'), false)
  assert.equal(V.promiseKept(P('training', { target: 8 }), done, d), true)
  assert.equal(V.promiseKept(P('focus', { target: 45 }), done, d), true)
  assert.equal(V.promiseKept(P('task', { ref: 'hi' }), done, d), true)
  assert.equal(V.promiseKept(P('task', { ref: 'lo' }), done, d), false)
  assert.equal(V.promiseKept(P('task', { ref: 'hi' }), done, '2026-11-13'), false)   // terminada otro día no cuenta hoy
  assert.equal(V.promiseKept(P('habit', { ref: 'speech' }), done, d), true)
  assert.equal(V.promiseKept(P('free'), done, d), false)
  assert.equal(V.promiseKept(P('free', { done: true }), done, d), true)
  // Puntuación: 70% promesas y 30% conducta; lo que diste = capacidad por puntuación.
  const all = { start: true, escape: true, people: true }
  const two = [P('reading', { target: 15 }), P('task', { ref: 'lo' })]
  assert.equal(V.varaOf({ capacity: 70, promises: two, anchors: all }, done, d).given, Math.round(70 * (0.7 * 0.5 + 0.3)))
  assert.equal(V.varaOf({ capacity: 70, promises: [two[0]], anchors: all }, done, d).given, 70)
  assert.equal(V.varaOf({ capacity: 40, anchors: { start: true, escape: false, people: true } }, done, d).given, Math.round(40 * 2 / 3))
  assert.equal(V.varaOf({ capacity: 70 }, done, d).given, null)                         // sin nada, no inventa
  // Cabeza contra hechos: habla solo con 15 puntos o más de diferencia, y en la dirección correcta.
  assert.equal(V.gutCheck(60, 70, { kept: 1, total: 1 }), null)
  assert.match(V.gutCheck(40, 70, { kept: 2, total: 2 }), /cobrando de más/)
  assert.match(V.gutCheck(90, 50, { kept: 1, total: 2 }), /promete menos/)
  // El modelo guarda la vara y tira la basura; un registro viejo sin vara abre igual.
  const clean = normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, felt: 55, anchors: { start: true, escape: 'x', people: false },
    promises: [P('reading', { target: 15 }), { id: 'z', kind: 'hackeo', label: 'x' }, P('free', { done: true }), P('task', { ref: 'a' }), P('focus', { target: 9999 })] }] }).checkins[0]
  assert.deepEqual(clean.anchors, { start: true, people: false })
  assert.equal(clean.felt, 55)
  assert.deepEqual(clean.promises.map(p => p.kind), ['reading', 'free', 'task'])   // máximo 3, tipo válido
  assert.equal(normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, given: 60 }] }).checkins[0].given, 60)
  assert.deepEqual(V.keptToday(normalizeData({ ...done, checkins: [{ id: d, day: d, capacity: 70, promises: [P('reading', { target: 15 }), P('task', { ref: 'lo' })] }] }), d), ['reading'])
  const rt = applyRecords({ ...EMPTY_DATA }, toRecords(normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, promises: [P('reading', { target: 15 })], anchors: all }] })))
  assert.equal(rt.checkins[0].promises[0].target, 15)
  assert.deepEqual(rt.checkins[0].anchors, all)
}
ok('la vara: promesas por capacidad, se marcan solas con registros del día, 70/30, cabeza contra hechos y el modelo la conserva')

// Reporte de la semana (weekly.ts): tú contra tu semana pasada
{
  const W = moduleOf('weekly')
  const sun = '2026-11-15', mon = '2026-11-16'
  const R = (id, day, min, extra = {}) => ({ id, day, minutes: min, note: '', ...extra })
  const S = (id, day) => ({ id, day, at: 1, exercise: 'pushup', reps: 10 })
  const data = normalizeData({ ...EMPTY_DATA,
    reading: [R('a', '2026-11-10', 20), R('b', '2026-11-12', 30), R('c', '2026-11-13', 60, { estimated: true }), R('d', '2026-11-04', 10)],
    sets: [S('s1', '2026-11-10'), S('s2', '2026-11-10'), S('s3', '2026-11-14'), S('s4', '2026-11-05')],
    checkins: [{ id: '2026-11-11', day: '2026-11-11', capacity: 70, given: 70, promises: [{ id: 'reading', kind: 'reading', label: 'Leer', target: 5 }] },
      { id: '2026-11-12', day: '2026-11-12', capacity: 70, given: 40 }] })
  const r = W.weekReport(data, sun)
  assert.equal(r.now.start, '2026-11-09')                 // domingo: la semana que cierra hoy
  assert.equal(r.now.readMin, 50)                          // lo estimado no suma
  assert.equal(r.now.readDays, 2)
  assert.equal(r.now.sets, 3); assert.equal(r.now.trainDays, 2)
  assert.equal(r.now.measured, 2); assert.equal(r.now.gaveDays, 1)
  assert.equal(r.now.promised, 1); assert.equal(r.now.kept, 0)   // el 11 no leyó: promesa sin cumplir
  assert.equal(r.before.readMin, 10)
  assert.ok(r.wins.some(w => /40 más/.test(w)))            // 50 contra 10
  assert.equal(W.weekReport(data, mon).now.start, '2026-11-09')   // lunes: todavía la semana que acaba de cerrar
  assert.equal(W.weekReport(normalizeData({ ...EMPTY_DATA }), sun).empty, true)
  // Una sola cosa a vigilar: muchas promesas incumplidas pesan más que todo lo demás.
  const broken = normalizeData({ ...data, checkins: ['2026-11-10', '2026-11-11', '2026-11-12'].map(d => ({ id: d, day: d, capacity: 80, promises: [{ id: 'f', kind: 'free', label: 'x' }] })) })
  assert.match(W.weekReport(broken, sun).watch, /promete menos/)
}
ok('reporte semanal: domingo y lunes, lo estimado no suma, promesas cumplidas y una sola cosa a vigilar')

// Conteos con plural: "1 hábitos" no debe volver a salir en pantalla
{
  const { plural } = moduleOf('text')
  assert.equal(plural(1, 'serie', 'series'), '1 serie'); assert.equal(plural(0, 'serie', 'series'), '0 series'); assert.equal(plural(3, 'día', 'días'), '3 días')
  const words = 'series|hábitos|días|sesiones|promesas|registros|tareas|lecturas|repeticiones|niveles|capítulos'
  const raw = new RegExp('\$\{([^{}]{1,40})\} (' + words + ')\b', 'g')
  const bad = []
  for (const dir of ['../src', '../src/lib']) for (const f of fs.readdirSync(path.join(__dirname, dir)).filter(n => /\.tsx?$/.test(n))) {
    const src = fs.readFileSync(path.join(__dirname, dir, f), 'utf8')
    for (const m of src.matchAll(raw)) if (!/toFixed|goal/.test(m[1])) bad.push(`${f}: ${m[0]}`)
  }
  assert.deepEqual(bad, [], 'conteo sin plural()')
}
ok('conteos con plural: 1 serie, 0 series, y ningún conteo crudo en el código')

// Votos por tu norte, rescates y nunca falles dos veces (identity.ts)
{
  const day = '2026-11-21'
  const base = normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, habits: [{ id: 'agua', label: 'Agua', mark: 'A' }] } })
  const d = { ...base, habits: { [day]: ['agua', 'borrado'] },
    reading: [{ id: 'r1', day, minutes: 5, seconds: 300, note: '', title: 'Libro' }, { id: 'r2', day, minutes: 0, note: '', title: 'x', estimated: true }],
    sets: [{ id: 's1', day, at: 1, exercise: 'pushup', reps: 8 }, { id: 's2', day, at: 2, exercise: 'pushup', reps: 8 }],
    activities: [rescueRow('Tomar agua', day), { id: 'f', day, kind: 'football', minutes: 60 }] }
  const v = votesOn(d, day)
  assert.equal(v.by.lectura, 1, 'la lectura estimada sin confirmar no vota')
  assert.equal(v.by.entreno, 1, 'el entreno es un voto por día, no por serie')
  assert.equal(v.by.habito, 1, 'un hábito que ya no existe no vota')
  assert.equal(v.by.rescate, 1)
  assert.equal(v.total, 4)
  assert.ok(isRescue(rescueRow('x')) && !isRescue({ id: 'o', day, kind: 'other', note: 'otra cosa' }))
  const t = dayTime(d, day)
  assert.equal(t.lectura, 5); assert.equal(t.entreno, 64); assert.equal(t.rescates, 1)
  assert.equal(neverTwice(new Set(['2026-11-19']), day), 'save', 'ayer faltó y antier sí: hoy se rescata')
  assert.equal(neverTwice(new Set(['2026-11-20']), day), null, 'ayer sí leyó: no hay aviso')
  assert.equal(neverTwice(new Set(['2026-11-10']), day), 'fresh')
  assert.equal(neverTwice(new Set(), day), null, 'alguien nuevo no recibe aviso de racha perdida')
  assert.equal(voteLine('alguien constante', 1), 'Tu primer hecho de hoy. Sigue.')
  assert.equal(votesOn({ ...base, habits: {} }, day).total, 0)
}
ok('votos por tu norte: un voto por acción real, entreno por día, rescates y nunca falles dos veces')

// Versículos sueltos (verses.ts) y nivel de arranque del coach
{
  assert.deepEqual([...parseVerses('16-18,21')], [16, 17, 18, 21])
  assert.equal(formatVerses([21, 16, 17, 18, 3]), '3,16-18,21')
  let b = addVerseMark([], 43, 3, [16, 17, 18], 36, '2026-11-21')
  assert.equal(b[0].verses, '16-18', 'unos versículos dejan el capítulo a medias')
  b = addVerseMark(b, 43, 3, [19, 20], 36, '2026-11-22')
  assert.equal(b[0].verses, '16-20'); assert.equal(b[0].day, '2026-11-21', 'conserva el día en que empezó')
  b = addVerseMark(b, 43, 3, Array.from({ length: 36 }, (_, i) => i + 1), 36, '2026-11-23')
  assert.equal(b[0].verses, undefined, 'al leer todos, el capítulo queda completo'); assert.equal(b.length, 1)
  assert.equal(addVerseMark(b, 43, 3, [1], 36, '2026-11-24'), b, 'un capítulo completo no se toca')
  const base = normalizeData({ ...EMPTY_DATA })
  const nuevo = normalizeData({ ...base, settings: { ...base.settings, trainingLevel: 1, equipment: ['nada', 'pared', 'silla'] } })
  const avanzado = normalizeData({ ...base, settings: { ...base.settings, trainingLevel: 4, equipment: ['nada', 'pared', 'silla'] } })
  assert.equal(nuevo.settings.trainingLevel, 1, 'el nivel sobrevive al limpiar')
  assert.ok(currentForSlot(nuevo, 'empuje').level < currentForSlot(avanzado, 'empuje').level, 'nivel 1 arranca más abajo que nivel 4')
  assert.equal(currentForSlot(base, 'empuje').id, 'pushup', 'sin nivel, arranca como antes')
}
ok('versículos sueltos se suman al capítulo y el coach arranca en el escalón de tu nivel')

// Estiramiento diario (stretch.ts): dura lo prometido, sobrevive al guardarse y suma su voto
{
  for (const w of ['manana', 'noche']) {
    const t = totalSeconds(stepsOf(w))
    assert.ok(t >= 240 && t <= 600, `${w}: la rutina dura entre 4 y 10 minutos (dura ${t} s)`)
    const short = totalSeconds(stepsOf(w, true))
    assert.ok(short >= 120 && short < 180, `${w}: la versión sin ganas ronda los 2 minutos (dura ${short} s)`)
  }
  assert.equal(stepsOf('noche').filter(s => s.name === 'Flexor de cadera').length, 4, 'lo que va por lado se hace de los dos lados')
  const base = normalizeData({ ...EMPTY_DATA })
  const day = '2026-11-22'
  const rows = [stretchRow('manana', 270, day), stretchRow('noche', 480, day), stretchRow('noche', 480, day), stretchRow('noche', 480, '2026-11-21')]
  const d = normalizeData({ ...base, activities: rows })
  assert.equal(d.activities.filter(isStretch).length, 4, 'el estiramiento sobrevive a normalizeData (no se pierde al sincronizar)')
  assert.deepEqual([...stretchedOn(d, day)].sort(), ['manana', 'noche'])
  assert.equal(votesOn(d, day).by.estira, 2, 'mañana y noche suman, repetir no infla')
  assert.equal(votesOn(d, day).by.entreno, 0, 'estirar no cuenta como entrenar')
  assert.equal(votesOn(d, day).by.rescate, 0, 'un estiramiento no es un rescate')
  assert.equal(stretchStreak(d, day), 2)
  assert.equal(stretchStreak(d, '2026-11-23'), 2, 'si hoy todavía no, la racha cuenta hasta ayer')
  assert.equal(stretchStreak(d, '2026-11-24'), 0)
  assert.equal(dayTime(d, day).entreno, 5 + 8 + 8, 'sus minutos entran a tu día medido')
  assert.equal(stretchSlot(7), 'manana'); assert.equal(stretchSlot(22), 'noche'); assert.equal(stretchSlot(15), null)
}
ok('estiramiento: dura lo prometido, sobrevive al guardarse, suma su voto y lleva racha')

// Marca predecible (docs/BRAND.md): tokens.css es el único dueño de los colores
{
  const css = f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const hex = t => (t.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length
  assert.equal(hex(css('v4.css')), 0, 'v4.css: usa var(--token), no colores sueltos')
  assert.equal(hex(css('v5.css')), 0, 'v5.css: usa var(--token), no colores sueltos')
  assert.equal(hex(css('v6.css')), 0, 'v6.css: usa var(--token), no colores sueltos')
  // Trinquete: los archivos viejos solo pueden BAJAR de colores sueltos. Si bajas uno, baja aquí el número.
  const LEGACY = { 'app.css': 157, 'brote.css': 158, 'features.css': 51, 'index.css': 180 }
  for (const [f, max] of Object.entries(LEGACY)) assert.ok(hex(css(f)) <= max, `${f} subió de ${max} colores sueltos: usa tokens`)
  // Todo token usado existe: un var(--mal-escrito) en CSS falla en silencio.
  assert.equal(hex(css('v7.css')), 0)
  assert.equal(hex(css('v8.css')), 0)
  const all = ['v8.css', 'v7.css', 'tokens.css', 'v4.css', 'v5.css', 'v6.css', 'app.css', 'brote.css', 'features.css', 'index.css'].map(css).join('\n')
  const defined = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
  const used = [...css('v8.css').matchAll(/var\((--[\w-]+)/g), ...css('v7.css').matchAll(/var\((--[\w-]+)/g), ...css('v4.css').matchAll(/var\((--[\w-]+)/g), ...css('v5.css').matchAll(/var\((--[\w-]+)/g), ...css('v6.css').matchAll(/var\((--[\w-]+)/g), ...css('tokens.css').matchAll(/var\((--[\w-]+)/g)].map(m => m[1])
  const missing = [...new Set(used.filter(t => !defined.has(t) && t !== '--p'))]
  assert.deepEqual(missing, [], 'tokens usados que no existen')
  // El nombre se escribe igual en todos lados: bambú, en minúscula y con acento.
  const shell = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8') + fs.readFileSync(path.join(__dirname, '../public/manifest.webmanifest'), 'utf8')
  assert.ok(!/\bbambu\b/.test(shell.replace(/bambu-/g, '')), 'index.html o manifest dicen "bambu" sin acento')
}
ok('marca predecible: v4 sin colores sueltos, trinquete en CSS viejo, tokens existentes y el nombre siempre bambú')

// Biblia católica completa y legible sin señal (bible.ts + public/biblia/bll)
{
  const B = moduleOf('bible')
  assert.equal(B.BOOKS.length, 73); assert.equal(B.TOTAL_CHAPTERS, 1328)
  assert.ok(B.BOOKS.every((b, i) => b.id === i + 1), 'BOOKS[id - 1] debe ser el libro id')
  assert.equal(B.book(27).chapters, 14)                                   // Daniel católico
  assert.equal(new Set(B.CANON).size, 73); assert.equal(new Set(B.ROUTE).size, 73)
  assert.equal(B.CANON[B.CANON.indexOf(16) + 1], 67)                       // Tobías va después de Nehemías
  assert.equal(B.CANON[B.CANON.indexOf(25) + 1], 73)                       // Baruc después de Lamentaciones
  assert.deepEqual(B.nextAfter(67, 14, 'canonico'), { book: 68, chapter: 1 })
  assert.deepEqual(B.nextAfter(43, 3, 'ruta'), { book: 43, chapter: 4 })
  assert.equal(B.nextAfter(66, 22, 'canonico'), null)
  // Un capítulo de Tobías no se pierde al guardarse ni al viajar por la nube.
  const tob = normalizeData({ ...EMPTY_DATA, bible: [{ id: '67:3', book: 67, chapter: 3, day: '2026-11-16' }], reading: [{ id: 'r', day: '2026-11-16', minutes: 10, note: '', bible: [{ book: 70, from: 1, to: 2 }] }] })
  assert.equal(tob.bible.length, 1); assert.equal(tob.reading[0].bible[0].book, 70)
  assert.equal(applyRecords({ ...EMPTY_DATA }, toRecords(tob)).bible[0].book, 67)
  assert.equal(normalizeData({ ...EMPTY_DATA, bible: [{ id: '74:1', book: 74, chapter: 1, day: '2026-11-16' }] }).bible.length, 0)
  // Cada archivo de texto existe y trae exactamente los capítulos que espera el seguimiento.
  const dir = path.join(__dirname, '../public/biblia/bll')
  for (const b of B.BOOKS) {
    const t = JSON.parse(fs.readFileSync(path.join(dir, `${b.id}.json`), 'utf8'))
    assert.equal(t.id, b.id); assert.equal(t.capitulos.length, b.chapters, `${b.name}: capítulos`)
    assert.ok(t.capitulos.every(c => c.length > 0 && c.every(([n, v]) => n > 0 && v.length > 0)), `${b.name}: capítulo vacío`)
  }
  assert.match(JSON.parse(fs.readFileSync(path.join(dir, 'indice.json'), 'utf8')).licencia, /Dominio público/)
}
ok('Biblia católica: 73 libros en su orden, Tobías sobrevive al guardarse y el texto cuadra capítulo por capítulo')

// Comida: registro, motor por edad y apretar tuercas
{
  const N = moduleOf('nutrition'), F = moduleOf('foods'), H = moduleOf('habitCoach'), V = moduleOf('pageVerses')
  const { modulesOf } = moduleOf('model')
  const day = '2026-11-22'
  const egg2 = F.itemOf(F.foodById('huevo'), 2), tort = F.itemOf(F.foodById('tortilla'), 3), apple = F.itemOf(F.foodById('manzana'), 1), chicken = F.itemOf(F.foodById('pollo'), 1)
  assert.equal(egg2.kcal, 144); assert.equal(egg2.protein, 12.6)
  const meals = [
    { id: 'm1', day, at: 1, slot: 'desayuno', items: [egg2, tort] },
    { id: 'm2', day, at: 2, slot: 'comida', items: [chicken, apple, F.itemOf(F.foodById('ensalada'), 1)] },
    { id: 'm3', day, at: 3, slot: 'colacion', items: [F.itemOf(F.foodById('refresco'), 1)] },
  ]
  const base = normalizeData({ ...EMPTY_DATA, meals })
  assert.equal(base.meals.length, 3, 'las comidas sobreviven a la limpieza')
  const t = N.dayTotals(base, day)
  assert.equal(t.proteinMeals, 2, 'huevo con tortilla (17 g) y pollo cuentan; el refresco no')
  assert.equal(t.produce, 2); assert.equal(t.sweets, 1); assert.equal(t.kcal, 144 + 195 + 165 + 95 + 15 + 140)
  assert.equal(N.proteinMealsOn(base, day), 2)
  assert.equal(N.proteinMealsOn(normalizeData({ ...EMPTY_DATA, checkins: [{ id: day, day, proteinMeals: 3 }] }), day), 3, 'sin comidas registradas vale el check-in')
  // Viaja a la nube y regresa igual
  const rows = diffRecords(EMPTY_DATA, base)
  assert.equal(rows.filter(r => r.collection === 'meal').length, 3)
  assert.deepEqual(applyRecords(EMPTY_DATA, rows).meals, base.meals)
  assert.equal(normalizeData({ ...EMPTY_DATA, meals: [{ id: 'x', day, items: [] }] }).meals.length, 0, 'comida vacía no entra')
  // Módulo: perfiles viejos lo ven encendido
  assert.equal(modulesOf(normalizeData({ ...EMPTY_DATA, settings: { modules: { reading: true, bible: true, training: true, focus: true } } }).settings).food, true)
  // Menor de edad: modo crecimiento, sin calorías
  const kid = normalizeData({ ...EMPTY_DATA, meals, settings: { age: 13 }, body: [{ day, weightKg: 50, heightCm: 160 }] })
  const kp = N.planFor(kid, Date.parse(`${day}T20:00:00`))
  assert.equal(kp.mode, 'crecimiento'); assert.equal('kcal' in kp, false, 'un menor no recibe meta de calorías')
  assert.equal(kp.perMealProtein, 15)
  // Comió de menos ayer con fútbol: se le avisa que coma más
  const y = '2026-11-21'
  const hungry = normalizeData({ ...kid, meals: [1, 2, 3].map(i => ({ id: 'h' + i, day: y, at: i, slot: 'comida', items: [F.itemOf(F.foodById('manzana'), 1)] })), activities: [{ id: 'f', day: y, kind: 'football', minutes: 60 }] })
  assert.equal(N.planFor(hungry, Date.parse(`${day}T09:00:00`)).fuel, 'bajo')
  const fed = normalizeData({ ...hungry, meals: [1, 2, 3, 4].map(i => ({ id: 'g' + i, day: y, at: i, slot: 'comida', items: [F.itemOf(F.foodById('torta'), 1), F.itemOf(F.foodById('leche'), 1)] })) })
  assert.equal(N.planFor(fed, Date.parse(`${day}T09:00:00`)).fuel, 'bien')
  // Adulto: fase por cintura y estatura, no por somatotipo
  assert.equal(N.decidePhase('musculo', 0.53, 3).phase, 'definir')
  assert.equal(N.decidePhase('musculo', 0.52, 0).phase, 'recomponer')
  assert.equal(N.decidePhase('musculo', 0.43, 2).phase, 'ganar')
  assert.equal(N.decidePhase('definir', 0.40, 2).phase, 'mantener')
  assert.equal(N.decidePhase('ambos', 0.47, 0.5).phase, 'recomponer')
  const adultBody = [{ day, weightKg: 80, heightCm: 180, waistCm: 95 }]
  const ap = N.planFor(normalizeData({ ...EMPTY_DATA, settings: { age: 30, nutrition: { sex: 'h', goal: 'definir', trainingYears: 3 } }, body: adultBody }), Date.parse(`${day}T12:00:00`))
  assert.equal(ap.mode, 'adulto'); assert.equal(ap.phase, 'definir'); assert.equal(ap.protein, 176)
  assert.ok(ap.kcal < ap.tdee.value && ap.kcal >= 1780, `déficit con piso: ${ap.kcal} vs ${ap.tdee.value}`)
  assert.deepEqual(N.planFor(normalizeData({ ...EMPTY_DATA, settings: { age: 30 } }), Date.now()).missing, ['sexo', 'estatura', 'peso', 'meta'])
  // Calibra con tu cuerpo: 21 días comiendo 2500 y bajando 0.05 kg al día = gasto ~2885
  const cal = { ...EMPTY_DATA, settings: { age: 30, nutrition: { sex: 'h', goal: 'ambos', trainingYears: 3 } }, meals: [], body: [] }
  for (let i = 1; i <= 21; i++) {
    const d = N.shiftDay(day, -i)
    cal.meals.push({ id: 'c' + i, day: d, at: i, slot: 'comida', items: [{ name: 'A', qty: 1, unit: 'x', kcal: 1250, protein: 40, group: 'platillo' }] }, { id: 'd' + i, day: d, at: i + 100, slot: 'cena', items: [{ name: 'B', qty: 1, unit: 'x', kcal: 1250, protein: 40, group: 'platillo' }] })
    cal.body.push({ day: d, weightKg: 80 + 0.05 * i, heightCm: 180 })
  }
  const tdee = N.tdeeOf(normalizeData(cal), day, 2400)
  assert.equal(tdee.source, 'tu-cuerpo'); assert.ok(Math.abs(tdee.value - 2885) < 5, `gasto ${tdee.value}`)
  assert.equal(N.tdeeOf(normalizeData({ ...cal, meals: cal.meals.slice(0, 10) }), day, 2400).source, 'formula', 'con 5 días registrados manda la fórmula')
  // Apretar tuercas
  const habits = [{ id: 'bible', label: 'Biblia', mark: 'B' }, { id: 'english', label: 'Inglés', mark: 'I' }]
  const allDays = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [N.shiftDay(day, -i), ['bible', 'english']]))
  let habData = normalizeData({ ...EMPTY_DATA, settings: { habits }, habits: allDays })
  const done = (h, d) => (habData.habits[d] ?? []).includes(h.id)
  const now = Date.parse(`${day}T12:00:00`)
  const advice = H.habitAdvice(habData, done, now)
  assert.equal(advice.kind, 'add'); assert.equal(advice.idea.id, 'proteina-desayuno', 'con Comida encendida y buen sueño, va lo de comida')
  const accepted = H.acceptIdea(habData, advice.idea, now)
  assert.ok(accepted.settings.habits.some(h => h.id === advice.idea.id))
  assert.equal(H.habitAdvice(normalizeData(accepted), done, now), null, 'recién aceptado: espera dos semanas')
  const skipped = normalizeData(H.skipIdea(habData, advice.idea.id, now))
  assert.equal(H.habitAdvice(skipped, done, now), null)
  const later = normalizeData({ ...habData, settings: { ...habData.settings, habitSuggest: { lastDay: N.shiftDay(day, -15), skipped: [advice.idea.id] } } })
  assert.equal(H.habitAdvice(later, done, now).kind, 'add')
  assert.notEqual(H.habitAdvice(later, done, now).idea.id, advice.idea.id, 'lo que dijiste que no, no vuelve')
  habData = normalizeData({ ...EMPTY_DATA, settings: { habits }, habits: Object.fromEntries(Object.keys(allDays).slice(0, 4).map(d => [d, ['bible']]).concat([[N.shiftDay(day, -19), []]])) })
  assert.equal(H.habitAdvice(habData, done, now).kind, 'tighten', 'si vas flojo no agrega: afianza')
  assert.equal(H.habitAdvice(habData, done, now).weakest.id, 'english')
  // Versículos: 4 por página, texto real, sin puntuación prohibida
  for (const [page, list] of Object.entries(V.PAGE_VERSES)) {
    assert.equal(list.length, 4, page)
    list.forEach(v => { assert.ok(v.text.length > 20 && v.text.length < 400); assert.doesNotMatch(v.text, /—|\.\.\.|…/) })
  }
}
{
  // El héroe pide la comida justo después de comer, solo a quien ya usa Comida
  const day = '2026-11-22', N = moduleOf('nutrition')
  const item = { name: 'Huevo', qty: 2, unit: 'pieza', kcal: 144, protein: 12.6, group: 'proteina' }
  const reader = { settings: { modules: { reading: true, bible: true, training: false, focus: false, food: true } }, reading: [{ id: 'r', day, minutes: 10, seconds: 600, note: '', title: 'Libro' }], checkins: [{ id: day, day, capacity: 60 }] }
  const used = normalizeData({ ...EMPTY_DATA, ...reader, meals: [{ id: 'y', day: N.shiftDay(day, -1), at: 1, slot: 'comida', items: [item] }] })
  assert.equal(nextStep(used, Date.parse(day + 'T15:00:00')).id, 'meal')
  assert.equal(nextStep(normalizeData({ ...used, meals: [...used.meals, { id: 't', day, at: 2, slot: 'comida', items: [item] }] }), Date.parse(day + 'T15:00:00')).id === 'meal', false, 'ya registrada, no insiste')
  assert.notEqual(nextStep(normalizeData({ ...EMPTY_DATA, ...reader }), Date.parse(day + 'T15:00:00')).id, 'meal', 'sin adoptar Comida no estorba')
}
ok('comida: totales, nube, modo crecimiento sin calorías, fase por cintura, gasto calibrado con tu cuerpo, apretar tuercas y versículos')

require('./share-auth.cjs')().then(() => audioChecks()).then(() => syncChecks()).then(() => console.log(`PASS ${passed.length} grupos:\n - ${passed.join('\n - ')}`)).catch(error => { console.error(error); process.exit(1) })

// NFC preserves elapsed time immediately, and a repeated finish cannot duplicate it.
{
  const activeReading = { id: 'reading:nfc-regression', day: today, startedAt: 1000, title: '', location: '' }
  const result = nfcServerAction({ ...EMPTY_DATA, activeReading }, { tag: 'reading' }, 601000, today)
  assert.equal(result.next.reading.length, 1)
  assert.equal(result.next.reading[0].seconds, 600)
  assert.equal(result.next.reading[0].id, activeReading.id)
  const repeated = nfcServerAction(result.next, { tag: 'reading' }, 611000, today)
  assert.equal(repeated.next.reading.length, 1)
  assert.equal(repeated.next.reading[0].seconds, 600)
}

// Paused overnight NFC sessions retain original day and cannot duplicate on repeated scans.
{
  const activeReading = { id: 'reading:overnight', day: '2026-11-09', startedAt: 1000, pausedAt: 301000, title: 'Libro', location: '' }
  let next = nfcServerAction({ ...EMPTY_DATA, activeReading }, { tag: 'reading' }, 601000, '2026-11-10').next
  assert.equal(next.reading[0].seconds, 300)
  assert.equal(next.reading[0].day, '2026-11-09')
  for (let i = 0; i < 20; i++) next = nfcServerAction(next, { tag: 'reading' }, 602000 + i * 1000, '2026-11-10').next
  assert.equal(next.reading.length, 1)
  assert.equal(next.reading[0].seconds, 300)
}

async function audioChecks() {
  const { createAudioEngine } = moduleOf('audioEngine')
  const events = {}, attributes = {}
  let pauses = 0, plays = 0
  const fake = { volume: 1, src: '', loop: false, setAttribute: (k, v) => attributes[k] = v, removeAttribute: k => delete fake[k], addEventListener: (name, fn) => events[name] = fn,
    play: async () => { plays++; events.playing() }, pause: () => { pauses++; events.pause() } }
  const engine = createAudioEngine(() => fake)
  const unsubscribe = engine.subscribe(() => {})
  await engine.play()
  assert.equal(fake.loop, true); assert.ok('playsinline' in attributes)
  assert.ok(fake.src.startsWith('blob:'))
  unsubscribe() // simulate useSyncExternalStore cleanup when a panel unmounts
  assert.equal(engine.getSnapshot().playing, true, 'unmount never stops the module engine')
  assert.equal(pauses, 0, 'unmount must not pause the element')
  events.pause()
  assert.equal(engine.getSnapshot().interrupted, true)
  assert.equal(plays, 1, 'no automatic retry loop during interruptions')
  await engine.play()
  engine.pause()
  assert.equal(engine.getSnapshot().interrupted, false)
  assert.equal(engine.getSnapshot().playing, false)
  engine.setTimer(15)
  assert.ok(engine.getSnapshot().deadline > Date.now())
  engine.stop()
  assert.equal(engine.getSnapshot().started, false)
  assert.equal(engine.getSnapshot().deadline, 0)
  for (const beat of [6, 10, 14]) {
    const wav = binauralWav(beat, 'brown'), v = new DataView(wav)
    for (let c = 0; c < 2; c++) {
      const first = v.getInt16(44 + c * 2, true), last = v.getInt16(wav.byteLength - 4 + c * 2, true)
      assert.ok(Math.abs(first - last) < 250, 'brown noise seam remains continuous')
    }
  }
  // El ruido no se apaga en la costura: nivel junto al corte parecido al de la mitad del bucle.
  {
    const brown = new DataView(binauralWav(10, 'brown')), pure = new DataView(binauralWav(10))
    const frames = 44100 * LOOP_SECONDS, w = 4410
    const rms = (from, to) => { let s = 0; for (let i = from; i < to; i++) { const d = brown.getInt16(44 + i * 4, true) - pure.getInt16(44 + i * 4, true); s += d * d }; return Math.sqrt(s / (to - from)) }
    const edge = 882, seam = Math.min(rms(0, edge), rms(frames - edge, frames)), mid = rms(frames / 2 - w * 10, frames / 2)
    assert.ok(seam > mid * .3, `ruido junto a la costura ${seam.toFixed(0)} contra ${mid.toFixed(0)} a la mitad`)
  }
  // iPhone: audio.volume siempre vale 1. El volumen se hornea en el WAV y el deslizador lo regenera.
  {
    const ev = {}
    const ios = { src: '', loop: false, currentTime: 0, setAttribute: () => {}, removeAttribute: () => {}, addEventListener: (n, fn) => ev[n] = fn,
      play: async () => { ev.playing() }, pause: () => { ev.pause() } }
    Object.defineProperty(ios, 'volume', { get: () => 1, set: () => {} })
    const e2 = createAudioEngine(() => ios)
    await e2.play()
    const before = ios.src
    e2.setVolume(15)
    await new Promise(r => setTimeout(r, 400))
    assert.notEqual(ios.src, before, 'en iPhone el volumen regenera el sonido')
    assert.equal(e2.getSnapshot().playing, true)
    e2.stop()
  }
  ok('audio singleton: unmount, user pause, interruption, timer, brown-noise seam and iPhone volume')
}

// v7: dynamic rest, conservative static dose and photographs with traceable licenses.
{
  const S = moduleOf('stretch'), science = moduleOf('science').EVIDENCE
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/estiramientos/indice.json'), 'utf8'))
  for (const when of ['manana', 'noche']) {
    for (const move of S.ROUTINES[when].moves) {
      assert.equal(move.kind, when === 'manana' ? 'dynamic' : 'static')
      assert.ok(move.seconds >= 10 && move.seconds <= 30)
      assert.ok(science.some(e => e.id === move.evidence))
      assert.ok(move.muscle && move.why)
      for (const img of index[move.photo].images) {
        assert.equal(img.license, 'Unlicense'); assert.ok(img.source.startsWith('https://'))
        const bytes = fs.readFileSync(path.join(__dirname, '../public/estiramientos', img.file))
        assert.equal(bytes[0], 255); assert.equal(bytes[1], 216)
      }
    }
  }
  for (const loaded of [[], ['pecho'], ['cuadriceps'], ['isquios']]) {
    for (const next of [[], ['hombros'], ['pantorrillas']]) {
      const m = S.restMobility(loaded, next)
      assert.equal(m.kind, 'dynamic', 'rest suggestion must never be static')
      assert.ok(m.seconds >= 20 && m.seconds <= 30)
      assert.ok(index[m.photo])
    }
  }
  assert.equal(S.ROUTINES.noche.rounds, 2)
  ok('v7 stretch: dose, dynamic rest, evidence and real photo files')
}

// v7 food: manufacturer portions, safe habits and adult-only UI gates.
{
  const F = moduleOf('foods'), N = moduleOf('nutrition'), C = moduleOf('foodCheckin')
  assert.equal(new Set(F.FOODS.map(f => f.id)).size, F.FOODS.length)
  assert.equal(F.foodById('wild-mini').protein, 10.3)
  assert.equal(F.foodById('wild-mini').kcal, 115)
  assert.equal(F.foodById('yoplait-natural').protein, 7.3)
  assert.equal(F.foodById('yoplait-fresa').kcal, Math.round(78 * 1.45))
  assert.equal(F.foodById('empanada-elote').estimated, true)
  for (const hunger of ['normal', 'often', 'little']) for (const breakfast of ['yes', 'sometimes', 'no']) for (const energy of ['good', 'low', 'rest']) {
    const advice = C.foodCheckinAdvice({ hunger, breakfast, energy }).join(' ')
    assert.doesNotMatch(advice, /kcal|calor|IMC|percentil|techo|bajar de peso|subir de peso/)
    if (energy === 'low' || hunger === 'little') assert.match(advice, /pediatra/)
  }
  for (const age of [5, 13, 17]) for (const goal of ['definir', 'musculo', 'ambos', 'salud']) {
    const d = normalizeData({ ...EMPTY_DATA, settings: { age, nutrition: { sex: 'h', goal } }, body: [{ day: '2026-11-22', weightKg: 50, heightCm: 160, waistCm: 90 }] })
    const p = N.planFor(d)
    assert.equal(p.mode, 'crecimiento')
    for (const key of ['kcal', 'phase', 'rate', 'tdee']) assert.equal(key in p, false, 'minor must not receive weight or calorie targets')
  }
  const page = fs.readFileSync(path.join(__dirname, '../src/FoodPage.tsx'), 'utf8')
  assert.ok(page.includes('{!growth && <Method />}'), 'adult method must be hidden for minors')
  // Decisión de Gael 23-nov: menores ven un PISO de energía (nunca techo ni déficit).
  assert.ok(Math.abs(N.eerTeen('h', 13, 45, 160, 1.26) - 2643.1) < 0.5, 'EER IOM 2005 contra el cálculo a mano')
  assert.ok(Math.abs(N.eerTeen('m', 13, 45, 160, 1.31) - 2307.1) < 0.5, 'EER IOM 2005 mujer')
  for (const goal of ['definir', 'musculo', 'ambos', 'salud', undefined]) {
    const flat = [0, 7, 14, 21, 27].map(k => ({ day: N.shiftDay('2026-11-22', -k), weightKg: 45, heightCm: 160 }))
    const d = normalizeData({ ...EMPTY_DATA, settings: { age: 13, footballDays: [1, 3, 5], nutrition: { sex: 'h', goal } }, body: flat })
    const f = N.planFor(d, Date.parse('2026-11-22T12:00:00')).floor
    assert.ok(f && f.kcal >= f.eer && f.extra >= 0, 'el piso nunca baja del gasto')
    assert.equal(f.extra, goal === 'musculo' || goal === 'ambos' ? 450 : 0, 'sin subir en 4 semanas, el extra crece; nunca para bajar')
    assert.doesNotMatch(f.why, /bajar|déficit|pasaste|exceso|demasiad/)
  }
  assert.ok(page.includes('<BodyInputs data={data} commit={commit} growth={growth} />'), 'un menor registra peso y estatura')
  assert.doesNotMatch(page.slice(page.indexOf('function GrowthToday'), page.indexOf('function AdultToday')), /pasaste|Te quedan|exceso/, 'pasar el piso nunca es malo')
  const logger = fs.readFileSync(path.join(__dirname, '../src/FoodLogger.tsx'), 'utf8')
  const item = { name: 'Label protein only', qty: 1, unit: 'portion', kcal: 0, protein: 12, group: 'proteina' }
  const data = normalizeData({ ...EMPTY_DATA, settings: { age: 13 }, body: [{ day: '2026-11-22', weightKg: 50, heightCm: 160 }], meals: [1,2,3].map(i => ({ id: String(i), day: '2026-11-21', at: i, slot: 'comida', items: [item] })) })
  assert.equal(N.planFor(data, Date.parse('2026-11-22T12:00:00')).fuel, 'sin-datos', 'unknown energy is not undereating')
  ok('v7 food: labels, habits, incomplete entries and minor protections')
}

// Pausa antes de las apps (Atajos de iOS): enlace, servidor, nota que sobrevive al limpiador, fricción.
{
  const P = moduleOf('pause'), day = '2026-11-23'
  assert.deepEqual(parseNfc('?nfc=pause&app=Instagram&k=x'), { tag: 'pause', app: 'instagram' })
  assert.deepEqual(parseNfc('?nfc=pause&app=tiktok&o=p10').outcome, { kind: 'pase', minutes: 10 })
  assert.equal(parseNfc('?nfc=pause&app=tiktok&o=p99').outcome, undefined, 'minutos raros no anotan nada')
  assert.equal(parseNfc('?nfc=pause&app=<script>').app, 'script')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(nfcServerAction(base, parseNfc('?nfc=pause&app=instagram'), 1, day).next, base, 'sin decisión no escribe')
  const r1 = nfcServerAction(base, parseNfc('?nfc=pause&app=instagram&o=r'), 1, day)
  const r2 = nfcServerAction(r1.next, parseNfc('?nfc=pause&app=instagram&o=p5'), 2, day)
  assert.deepEqual(P.pauseStats(r2.next, day), { total: 2, resisted: 1 })
  assert.match(r2.text, /1 de 2 veces/)
  // La nota viaja por registros y vuelve igual (el servidor limpia con el mismo modelo).
  const back = applyRecords(EMPTY_DATA, diffRecords(base, r2.next, 10))
  assert.deepEqual(P.pauseStats(normalizeData(back), day), { total: 2, resisted: 1 }, 'la pausa sobrevive al viaje por la nube')
  assert.deepEqual([0, 1, 2, 5, 9].map(P.breathSeconds), [5, 8, 11, 20, 20], 'la respiración crece y topa en 20 s')
  assert.match(P.passShortcutUrl(P.pauseApp('instagram'), 10), /^shortcuts:\/\/run-shortcut\?name=Bamb%C3%BA%20Pase&input=text&text=10%7Cinstagram%3A%2F%2F$/)
  ok('pausa antes de las apps: enlace, servidor, nube y fricción')
}

// Google directo: el rechazo del trigger de invitación se traduce, otros errores no.
{
  const O = moduleOf('oauth')
  assert.equal(O.isInviteRejection('Database error saving new user'), true)
  assert.equal(O.isInviteRejection('Invalid nonce'), false)
  ok('google: rechazo por invitación reconocido')
}
