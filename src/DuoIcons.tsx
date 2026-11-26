export type DuoIconName = 'camara' | 'fuego' | 'rayo' | 'pesa' | 'cama' | 'check' | 'estrella' | 'lista' | 'planta' | 'casa' | 'engrane' | 'candado' | 'cofre' | 'mas' | 'reloj' | 'libro' | 'plato' | 'etiqueta' | 'sol' | 'escudo' | 'tenis' | 'bici' | 'espada' | 'caminar' | 'fantasma' | 'trofeo' | 'amigos'

import type { ReactNode } from 'react'

export function DuoIcon({ name, size = 28, off = false }: { name: DuoIconName; size?: number; off?: boolean }) {
  return <svg className={`duo-icon duo-${name} ${off ? 'off' : ''}`} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">{PATHS[name]}</svg>
}

const PATHS: Record<DuoIconName, ReactNode> = {
  camara: <>
    <path className="ia rnd" d="M11.5 7.5h9l1.8 3H26a2.5 2.5 0 0 1 2.5 2.5v10.5A2.5 2.5 0 0 1 26 26H6a2.5 2.5 0 0 1-2.5-2.5V13A2.5 2.5 0 0 1 6 10.5h3.7l1.8-3Z" />
    <circle className="ib" cx="16" cy="18" r="5.6" />
    <circle className="ic" cx="16" cy="18" r="3" />
  </>,
  fuego: <>
    <path className="ia rnd" d="M16 3c.9 3.6 5.3 6.1 7.3 9.6 3.2 5.6.2 15.9-7.3 15.9S5.5 18.4 8.7 12.6c.9-1.6 2.2-2.7 3-4.1.5 1.7 1.3 2.6 2.3 3.1C13.6 8.8 14.4 5.6 16 3Z" />
    <path className="ib" d="M16 15.5c.8 2 3.6 3.2 3.6 6.3A3.6 3.6 0 0 1 16 25.5a3.6 3.6 0 0 1-3.6-3.7c0-1.8 1-2.9 1.9-3.8.3.9.8 1.4 1.3 1.7-.1-1.6.1-2.9.4-4.2Z" />
  </>,
  rayo: <path className="ia rnd" d="M18.6 3.5 7.8 17.2h7l-1.4 11.3 10.8-13.7h-7l1.4-11.3Z" />,
  pesa: <>
    <rect className="ia" x="8" y="14.4" width="16" height="3.2" rx="1.6" />
    <rect className="ia" x="5" y="8.5" width="5.2" height="15" rx="2.6" />
    <rect className="ia" x="21.8" y="8.5" width="5.2" height="15" rx="2.6" />
    <rect className="ia" x="1.6" y="12" width="3.8" height="8" rx="1.9" />
    <rect className="ia" x="26.6" y="12" width="3.8" height="8" rx="1.9" />
  </>,
  cama: <>
    <rect className="ia" x="3" y="8.5" width="4" height="19.5" rx="2" />
    <rect className="ia" x="3" y="16" width="26" height="8" rx="2.5" />
    <rect className="ia" x="25" y="21" width="4" height="7" rx="2" />
    <rect className="ib" x="8.5" y="11.5" width="7" height="4.5" rx="2.2" />
  </>,
  check: <path className="sa thick" d="M7 16.5l6 6L25.5 9.5" />,
  amigos: <>
    <circle className="ic rnd" cx="22" cy="10.5" r="4.6" />
    <path className="ic rnd" d="M14.5 26.5c.4-5.4 3.4-8.6 7.5-8.6s7.1 3.2 7.5 8.6c0 .9-.7 1.5-1.5 1.5H16c-.8 0-1.5-.6-1.5-1.5Z" />
    <circle className="ia rnd" cx="11.5" cy="12" r="5.2" />
    <path className="ia rnd" d="M2.5 28.5c.4-6 3.9-9.6 9-9.6s8.6 3.6 9 9.6c.1 1-.7 1.7-1.6 1.7H4.1c-.9 0-1.7-.7-1.6-1.7Z" />
    <path className="sb" d="M9.6 12.6h.01M13.4 12.6h.01" />
  </>,
  trofeo: <>
    <path className="ia rnd" d="M9 4h14v7a7 7 0 0 1-14 0V4Z" />
    <path className="sa" d="M9 7H5.5a3.5 3.5 0 0 0 3.8 5M23 7h3.5a3.5 3.5 0 0 1-3.8 5" />
    <path className="ia" d="M13.5 17.5h5l.8 5h-6.6l.8-5Z" />
    <rect className="ic rnd" x="9.5" y="22.5" width="13" height="5" rx="1.8" />
    <path className="sb" d="m16 7.5 1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.7 2.4-.3L16 7.5Z" />
  </>,
  estrella: <path className="ia rnd" d="m16 4 3.6 7.4 8.1 1.1-5.9 5.7 1.4 8.1L16 22.5l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.1L16 4Z" />,
  lista: <>
    <rect className="ia" x="6" y="3.5" width="20" height="25" rx="4.5" />
    <path className="sb" d="M11 11h10M11 16h10M11 21h6" />
  </>,
  planta: <>
    <path className="sa" d="M16 19.5v-8" />
    <path className="ia rnd" d="M15.6 12.5C10.8 12.6 8 9.9 7.6 5.6c4.6-.1 7.6 2.4 8 6.9Z" />
    <path className="ia rnd" d="M16.4 15c4.4 0 7.1-2.4 7.6-6.4-4.2 0-7.2 2.3-7.6 6.4Z" />
    <path className="ic rnd" d="M8.5 19h15l-1.7 8.3a1.6 1.6 0 0 1-1.6 1.2h-8.4a1.6 1.6 0 0 1-1.6-1.2L8.5 19Z" />
  </>,
  casa: <>
    <path className="ia" d="M7 14.5 16 7l9 7.5V27a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 7 27V14.5Z" />
    <path className="sc" d="M4 15.5 16 5.5l12 10" />
    <rect className="ib" x="13.5" y="19.5" width="5" height="9" rx="1.6" />
  </>,
  engrane: <path className="ia" fillRule="evenodd" d="M13.4 2.5h5.2l.8 3.6a10 10 0 0 1 2.6 1.5l3.5-1.2 2.6 4.5-2.7 2.5a10 10 0 0 1 0 3l2.7 2.5-2.6 4.5-3.5-1.2a10 10 0 0 1-2.6 1.5l-.8 3.6h-5.2l-.8-3.6a10 10 0 0 1-2.6-1.5l-3.5 1.2-2.6-4.5 2.7-2.5a10 10 0 0 1 0-3L4.5 10.9l2.6-4.5 3.5 1.2a10 10 0 0 1 2.6-1.5l.8-3.6ZM16 20.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />,
  candado: <>
    <path className="sc" d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" />
    <rect className="ia" x="7" y="13.5" width="18" height="15" rx="3.8" />
    <path className="ib" d="M16 18a2.2 2.2 0 0 1 1.1 4.1V24a1.1 1.1 0 0 1-2.2 0v-1.9A2.2 2.2 0 0 1 16 18Z" />
  </>,
  cofre: <>
    <rect className="ia" x="4" y="15.5" width="24" height="12.5" rx="3" />
    <path className="ic" d="M4 14c0-4.4 3.1-8 7-8h10c3.9 0 7 3.6 7 8v.5H4V14Z" />
    <rect className="ib" x="13.5" y="12" width="5" height="7" rx="1.8" />
  </>,
  mas: <path className="sa thick" d="M16 7v18M7 16h18" />,
  reloj: <>
    <circle className="ia" cx="16" cy="16.5" r="12" />
    <path className="sb" d="M16 10.5v6.5l4 2.5" />
  </>,
  libro: <>
    <path className="ia rnd" d="M4 7.5c3.8-.9 7.8-.4 11 1.8V27c-3.2-2-7.2-2.6-11-1.8V7.5Z" />
    <path className="ic rnd" d="M28 7.5c-3.8-.9-7.8-.4-11 1.8V27c3.2-2 7.2-2.6 11-1.8V7.5Z" />
  </>,
  plato: <>
    <circle className="ia" cx="16" cy="16.5" r="7" />
    <circle className="ib" cx="16" cy="16.5" r="3.6" />
    <path className="sc" d="M4.5 5v6a2 2 0 0 0 4 0V5M6.5 13v14" />
    <path className="ic rnd" d="M27 27V5c-2.4 1.6-3.6 4.4-3.6 8 0 2.4 1 3.6 3.6 3.6" />
  </>,
  etiqueta: <>
    <rect className="ia" x="4" y="7" width="24" height="18" rx="4.5" />
    <path className="sb" d="M12.5 12.5a4.5 4.5 0 0 1 0 7M16 10.5a8 8 0 0 1 0 11M19.5 8.5a11.5 11.5 0 0 1 0 15" />
  </>,
  escudo: <>
    <path className="ia rnd" d="M16 3.5 26.5 7.3v8.2c0 6.3-4.3 11-10.5 12.8C9.8 26.5 5.5 21.8 5.5 15.5V7.3L16 3.5Z" />
    <path className="sb" d="m11.5 16 3.2 3.2 5.8-6.2" />
  </>,
  tenis: <>
    <path className="ia rnd" d="M3.5 20.5c0-1.3 1-2.3 2.3-2.3h3.4l3.1-7.3c.4-.9 1.4-1.3 2.3-.9l1.2.6c.7.3 1.5.4 2.2.1l1.6-.6 2.8 6.1c3.6.8 6.9 2.4 6.9 4.9v.9H3.5v-1.5Z" />
    <rect className="ic" x="3" y="23.5" width="26.5" height="4" rx="2" />
    <path className="sb" d="M13.3 13.8h3M12.2 16.8h3.6" />
  </>,
  bici: <>
    <circle className="sa" cx="8" cy="21" r="5.5" />
    <circle className="sa" cx="24" cy="21" r="5.5" />
    <path className="sc" d="M8 21l4.5-9h8.5L24 21M12.5 12l4.5 9H8M19.5 8.5h3.5" />
  </>,
  sol: <>
    <circle className="ia" cx="16" cy="16" r="6.5" />
    <path className="sc" d="M16 3v3.5M16 25.5V29M3 16h3.5M25.5 16H29M6.8 6.8l2.5 2.5M22.7 22.7l2.5 2.5M6.8 25.2l2.5-2.5M22.7 9.3l2.5-2.5" />
  </>,
  caminar: <>
    <circle className="ia" cx="19" cy="5" r="3.2" />
    <path className="sa mid" d="M18 10.5l-2.5 8M15.5 18.5l-2.6 5-3.2 4.6M15.5 18.5l4 4 1 5.6M17.6 11.6l3.4 3.9 3.6 1.1M17.6 11.6l-4 2.5-1.6 4" />
  </>,
  fantasma: <>
    <path className="ia rnd" d="M16 3.5c-5.5 0-9.5 4-9.5 9.5v14.5l3.2-2.4 3.1 2.4 3.2-2.4 3.2 2.4 3.1-2.4 3.2 2.4V13c0-5.5-4-9.5-9.5-9.5Z" />
    <circle className="ib" cx="12.6" cy="13.5" r="2.1" /><circle className="ib" cx="19.4" cy="13.5" r="2.1" />
  </>,
  espada: <>
    <path className="ia rnd" d="M27 5l-1.2 5.6L13.6 22.8 9.2 18.4 21.4 6.2 27 5Z" />
    <path className="sc" d="M7.6 15.2l9.2 9.2M9.8 22.2l-4.6 4.6" />
  </>,
}
