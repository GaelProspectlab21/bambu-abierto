/**
 * Punto de entrada del paquete que usan las funciones de Supabase (bambu-remind y bambu-nfc).
 * `pnpm build:remind` lo empaqueta a supabase/functions/_shared/core.js para que el servidor
 * decida con exactamente el mismo código que la app.
 */
export { applyRecords, diffRecords, type RecordRow } from './records'
export { EMPTY_DATA, cleanSettings } from './model'
export { dueKinds, dueNotes, testNote, type Note } from './reminders'
export { parseNfc } from './nfc'
export { nfcServerAction } from './nfcActions'
