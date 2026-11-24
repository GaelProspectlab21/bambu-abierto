import { useState } from 'react'
import { PAUSE_APPS } from './lib/pause'
import { Card } from './ui'

/** Ajustes: el enlace de la pausa con tu llave y los pasos para armar los dos atajos de iOS. */
export function PauseSetup({ keyValue, onCopy }: { keyValue: string; onCopy: (text: string) => void }) {
  const [app, setApp] = useState('instagram')
  const url = `${window.location.origin}/?nfc=pause&app=${app}${keyValue ? `&k=${keyValue}` : ''}`
  return <Card className="pause-setup">
    <h2>Pausa antes de las apps</h2>
    <p>Cuando abras Instagram o TikTok, primero aparece bambú: respiras, dices a qué venías y eliges. Si es por costumbre, te propone otra cosa. Si es algo concreto, entras con tiempo límite.</p>
    <label className="field-label">App<select className="text-input" value={app} onChange={e => setApp(e.target.value)}>{PAUSE_APPS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <code>{url}</code>
    <button type="button" className="secondary-button" disabled={!keyValue} onClick={() => onCopy(url)}>Copiar enlace</button>
    <details>
      <summary>Atajo 1: Bambú Pase (se hace una vez)</summary>
      <ol>
        <li>Abre Atajos, toca + y ponle de nombre exacto <b>Bambú Pase</b>.</li>
        <li>Agrega <b>Dividir texto</b>: entrada del atajo, separado por personalizado <b>|</b>.</li>
        <li>Agrega <b>Obtener elemento de la lista</b>: primer elemento. Agrega <b>Ajustar fecha</b>: Fecha actual, sumar ese número en minutos.</li>
        <li>Agrega <b>Guardar archivo</b> con la fecha ajustada, en la carpeta Atajos, nombre <b>bambu-pase.txt</b>, y activa Reemplazar.</li>
        <li>Agrega <b>Obtener elemento de la lista</b>: último elemento del texto dividido. Agrega <b>Abrir URL</b> con ese elemento.</li>
      </ol>
    </details>
    <details>
      <summary>Atajo 2: Bambú Pausa, y la automatización por app</summary>
      <ol>
        <li>Nuevo atajo llamado <b>Bambú Pausa</b>. Agrega <b>Obtener archivo</b> de la carpeta Atajos, ruta <b>bambu-pase.txt</b>, y apaga Mostrar error si no se encuentra.</li>
        <li>Agrega <b>Obtener fechas</b> del archivo. Agrega <b>Si</b>: Fechas es después de Fecha actual, entonces <b>Detener este atajo</b>. Así tu pase vigente no se interrumpe.</li>
        <li>Después del Si, agrega <b>Abrir URL</b> con el enlace que copiaste arriba.</li>
        <li>Ve a Automatización, toca +, elige <b>App</b>, escoge Instagram, marca Se abre y <b>Ejecutar de inmediato</b>. Acción: Ejecutar atajo, Bambú Pausa.</li>
        <li>Repite la automatización para cada app, con su propio enlace de arriba.</li>
      </ol>
    </details>
    <p className="hint">Es una pausa, no un candado: siempre puedes entrar. Lo que cambia es que entras eligiendo. Cada vez que eliges otra cosa queda en tu historial.</p>
  </Card>
}
