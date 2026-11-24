import { useEffect, useState } from 'react'
import type { AppData } from './lib/model'
import type { PersonalTask } from './lib/personal'
import { askJev, buildBlock, localGuess } from './lib/assist'
import { accountCapabilities, supabase } from './lib/supabase'
import { FocusBlock, FocusHistory, WeekView, type Preset } from './FocusPage'
import { TasksPage } from './TasksPage'
import { Heading, Tabs } from './ui'

type Commit = (update: (d: AppData) => AppData) => void
export type HubTab = 'lista' | 'bloque' | 'semana' | 'historial'

/**
 * Tareas y enfoque en un solo lugar. Elegir una o varias tareas y tocar «Armar bloque»
 * hace que Jev (o una regla simple si no responde) rellene nivel, duración y mini entregables.
 * Tú revisas y empiezas: el trabajo difícil, empezar, se queda en un solo toque.
 */
export function TasksHub({ data, commit, onMessage, tab, setTab, preset, setPreset }: {
  data: AppData; commit: Commit; onMessage: (t: string) => void
  tab: HubTab; setTab: (t: HubTab) => void; preset: Preset | null; setPreset: (p: Preset | null) => void
}) {
  const [jevAllowed, setJevAllowed] = useState(false)
  useEffect(() => { let active = true; void accountCapabilities().then(c => { if (active) setJevAllowed(c.jev) }); return () => { active = false } }, [])
  const [busy, setBusy] = useState(false)
  // Cada bloque armado remonta el formulario con sus datos; consumir el preset no debe remontarlo otra vez.
  const [formKey, setFormKey] = useState(0)
  const active = data.activeFocus
  const tabs = <Tabs label="Tareas y enfoque" value={tab} onChange={setTab} options={[['lista', 'Pendientes'], ['bloque', active ? 'Bloque en curso' : 'Preparar bloque'], ['semana', 'Mi semana'], ['historial', 'Historial']]} />

  async function prepare(tasks: PersonalTask[]) {
    if (!tasks.length || busy) return
    setBusy(true)
    const jev = await askJev(tasks, jevAllowed && supabase ? (name, opts) => supabase!.functions.invoke(name, opts) : null)
    const draft = buildBlock(tasks, jev ?? tasks.map(localGuess))
    setPreset({ task: draft.task, taskIds: draft.taskIds, taskId: draft.taskIds.length === 1 ? draft.taskIds[0] : undefined, minutes: draft.minutes, level: draft.level, goal: draft.goal, micro: draft.micro, source: draft.source })
    setFormKey(k => k + 1)
    setBusy(false)
    setTab('bloque')
    onMessage(draft.source === 'jev' ? 'Jev armó tu bloque. Revísalo y empieza.' : 'Armé tu bloque con una regla simple. Revísalo y empieza.')
  }

  return <>
    {tab === 'lista' && <TasksPage data={data} onChange={tasks => commit(d => ({ ...d, tasks }))} onPrepare={t => void prepare(t)} busy={busy} jevAllowed={jevAllowed} tabs={tabs} />}
    {tab !== 'lista' && <>
      <Heading eyebrow="TAREAS" title={tab === 'bloque' ? (active ? active.task : 'Un bloque, lo que mueve la aguja.') : tab === 'semana' ? 'Tu semana de enfoque.' : 'Tus bloques.'} text={tab === 'bloque' && !active ? 'Revisa tu bloque, cambia lo que quieras y empieza.' : undefined} />
      {tabs}
      {tab === 'bloque' && <FocusBlock key={formKey} data={data} commit={commit} onMessage={onMessage} preset={preset} onPresetUsed={() => setPreset(null)} />}
      {tab === 'semana' && <WeekView data={data} />}
      {tab === 'historial' && <FocusHistory data={data} />}
    </>}
  </>
}
