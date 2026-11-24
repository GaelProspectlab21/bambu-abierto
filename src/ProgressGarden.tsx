import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData } from './lib/model'
import { game, XP_RULES, type Quest } from './lib/gamification'
import { Chips } from './ui'
import { plural } from './lib/text'

type Go = (section: Quest['go']) => void

export function ProgressGarden({ data, compact = false, go }: { data: AppData; compact?: boolean; go?: Go }) {
  const g = useMemo(() => game(data), [data])
  const [area, setArea] = useState<'Lectura' | 'Entreno' | 'Enfoque' | 'Hábitos'>('Entreno')
  const pct = Math.round((g.xp - g.levelStart) / (g.levelEnd - g.levelStart) * 100)
  const unlocked = g.achievements.filter(a => a.unlocked).length
  const next = g.rankInfo.next
  // "+N XP" flota solo cuando la XP de hoy SUBE mientras miras (no al abrir la pantalla).
  const lastXp = useRef(g.todayXp)
  const [gain, setGain] = useState<{ xp: number; id: number } | null>(null)
  useEffect(() => {
    const diff = g.todayXp - lastXp.current
    lastXp.current = g.todayXp
    if (diff <= 0) return
    setGain({ xp: diff, id: Date.now() })
    const t = window.setTimeout(() => setGain(null), 1600)
    return () => window.clearTimeout(t)
  }, [g.todayXp])
  return <section className="card game-card" aria-label="Tu progreso">
    <div className="game-top">
      <img className={`rank-art ${g.dayComplete ? 'brote-happy' : ''}`} src={g.rankInfo.image} alt={`Tu etapa: ${g.rank}`} width="76" height="76" />
      <div><span className="eyebrow">TU BAMBÚ · ETAPA {g.rankInfo.index + 1} DE 10</span><h2>{g.rank}</h2><small>Nivel {g.level} · {g.xp.toLocaleString('es-MX')} XP · {g.levelEnd - g.xp} para el nivel {g.level + 1}</small></div>
      <div className="lvl" style={{ ['--p' as string]: `${pct}%` }}><b>{g.level}</b></div>
    </div>
    <div className="xp-wrap">
      <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Experiencia del nivel"><span style={{ width: `${pct}%` }} /></div>
      {gain && <span key={gain.id} className="xp-float" aria-live="polite">+{gain.xp} XP</span>}
    </div>
    {g.heritageXp > 0 && <p className="heritage">Heredaste <b>{g.heritageXp.toLocaleString('es-MX')} XP</b> de tu historia en Códice y Cauce. En Bambú llevas <b>{g.bambuXp.toLocaleString('es-MX')} XP</b>, día {g.bambuDay}.</p>}
    <div className="week-stalk" aria-label={`Semana de bambú: ${g.week.good} de ${g.week.goal} días sólidos`}>
      <div className="week-stalk-head"><span className="eyebrow">SEMANA DE BAMBÚ</span><strong>{g.week.good}<small>/{g.week.goal}</small></strong></div>
      <div className="week-stalk-row" aria-hidden="true">{g.week.days.map((d, i) => <i key={d.day} className={`${d.good ? 'on' : ''} ${d.future ? 'future' : ''}`}><small>{'LMMJVSD'[i]}</small></i>)}</div>
      <small>{g.week.bonus ? 'Semana sólida lograda: +40 XP.' : `Día sólido = 3 misiones o más. ${g.week.goal} en la semana dan +40 XP.`}</small>
    </div>
    {!compact && next && <div className="next-rank"><img src={next.image} alt="" width="56" height="56" loading="lazy" /><div><span className="eyebrow">SIGUIENTE ETAPA</span><strong>{next.name}</strong><small>En el nivel {next.level}. Te {next.level - g.level === 1 ? 'falta 1 nivel' : `faltan ${plural(next.level - g.level, 'nivel', 'niveles')}`}.</small></div></div>}
    <div className="section-heading"><div><span className="eyebrow">MISIONES DE HOY · +{g.todayXp} XP</span><h3>{g.dayComplete ? 'Día completo. Así se echa raíz.' : `${g.questsDone} de ${g.quests.length}`}</h3></div>
      <div className="ring" style={{ ['--p' as string]: `${g.questsDone / g.quests.length * 100}%` }}><b>{g.questsDone}/{g.quests.length}</b></div></div>
    {compact ? <div className="quest-chips">{g.quests.map(q => <button key={q.id} className={`quest-chip ${q.done ? 'done' : ''}`} onClick={() => !q.done && go?.(q.go)} aria-pressed={q.done}><i aria-hidden="true">{q.done ? '✓' : ''}</i>{q.label}</button>)}</div>
      : <div className="quests">{g.quests.map(q => <button key={q.id} className={`quest ${q.done ? 'done' : ''}`} onClick={() => !q.done && go?.(q.go)} aria-pressed={q.done}><i>{q.done ? '✓' : ''}</i><span>{q.label}</span><small>{q.done ? 'Hecha' : 'Ir'}</small></button>)}</div>}
    {!compact && <p className="hint">Días completos: {g.perfectDays}{g.perfectStreak ? ` · ${g.perfectStreak} seguidos` : ''}. Completar las 5 da +25 XP.</p>}
    {!compact && <>
      <div className="section-heading"><div><span className="eyebrow">LOGROS</span><h3>{unlocked} de {g.achievements.length}</h3></div></div>
      <Chips label="Área de logros" value={area} onChange={setArea} options={[['Entreno', 'Entreno'], ['Lectura', 'Lectura'], ['Enfoque', 'Enfoque'], ['Hábitos', 'Días completos']]} />
      <div className="ach-grid">{g.achievements.filter(a => a.area === area).map(a => <div key={a.id} className={`ach ${a.unlocked ? 'on' : ''}`}><strong>{a.name}</strong><small>{a.description}</small><div className="bar"><span style={{ width: `${a.progress * 100}%` }} /></div></div>)}</div>
      <details><summary>Cómo ganas experiencia</summary><ul className="steps">{XP_RULES.map(([r, x]) => <li key={r}>{r}: +{x} XP</li>)}</ul><p className="hint">Todo sale de lo que registras y se recalcula desde cero: no hay premios al azar. Los días estimados solo cuentan si confirmaste que leíste.</p></details>
    </>}
  </section>
}
