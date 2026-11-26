import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Sheet({ title, onClose, children, tall = false }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  return createPortal(<div className="d-scrim" onClick={onClose}>
    <div className={`d-sheet ${tall ? 'tall' : ''}`} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
      <div className="d-sheet-head"><h2>{title}</h2><button type="button" className="d-x" onClick={onClose} aria-label="Cerrar">×</button></div>
      {children}
    </div>
  </div>, document.body)
}
