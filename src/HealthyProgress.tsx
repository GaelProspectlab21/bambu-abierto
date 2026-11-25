import { modulesOf, type AppData } from './lib/model'
import { healthyProgress } from './lib/healthyProgress'
import { plural } from './lib/text'
import { Card } from './ui'
import type { Section } from './TodayPage'

export function HealthyProgress({ data, go }: { data: AppData; go: (section: Section) => void }) {
  const p = healthyProgress(data), mods = modulesOf(data.settings)
  const north = data.profile.north?.trim()
  if (!p.votes && !p.reading.total && !p.strengthDays) return null
  return <Card className="healthy-progress">
    <h2>Lo que ya construiste</h2>
    {north && p.votes > 0 && <p><strong>{plural(p.votes, 'hecho', 'hechos')} hoy.</strong> Tu norte: {north}.</p>}
    {mods.reading && p.reading.total > 0 && <p><strong>{plural(p.reading.total, 'día de lectura', 'días de lectura')} guardados.</strong> Un día en blanco no borra lo aprendido. Tu mejor racha sigue siendo de {plural(p.reading.best, 'día', 'días')}.</p>}
    {mods.training && p.strengthDays > 0 && <p><strong>{plural(p.strengthDays, 'día de fuerza', 'días de fuerza')} en los últimos 7 días.</strong> El descanso también es parte del plan. Sigue lo que indique tu coach.</p>}
    {!north && p.votes > 0 && <p><strong>{plural(p.votes, 'hecho', 'hechos')} hoy.</strong> Cada acción cuenta, aunque sea pequeña. <button type="button" className="quiet-button inline" onClick={() => go('Ajustes')}>Elegir mi norte</button></p>}
    <details><summary>Ver mis avances</summary><p className="hint">Tu historial conserva tus registros. No hace falta llenar todas las áreas hoy.</p><button type="button" className="secondary-button" onClick={() => go('Historial')}>Abrir mi historial</button></details>
  </Card>
}
