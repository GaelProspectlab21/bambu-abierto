// Tipos mínimos del paquete generado desde src/lib/remindServer.ts.
type Row = { collection: string; id: string; payload: Record<string, unknown>; deleted: boolean; clientUpdatedAt: number }
type Note = { kind: string; key: string; title: string; body: string; url: string }
type Settings = { reminders: unknown; sleepTarget: number; [k: string]: unknown }
export declare const EMPTY_DATA: Record<string, unknown>
export declare function applyRecords(data: Record<string, unknown>, rows: Row[]): Record<string, unknown>
export declare function cleanSettings(value: unknown): Settings
export declare function dueKinds(reminders: unknown, sleepTarget: number, now: number): string[]
export declare function dueNotes(data: Record<string, unknown>, now: number): Note[]
export declare function testNote(): Note
export declare function diffRecords(prev: Record<string, unknown>, next: Record<string, unknown>, now?: number): Row[]
export declare function parseNfc(search: string): { tag: string; habit?: string } | null
type Night = { capacity: number; given: number; reflection?: string }
export declare function nfcServerAction(data: Record<string, unknown>, action: { tag: string; habit?: string; night?: Night }, now: number, day: string): { next: Record<string, unknown>; title: string; text: string; open?: boolean }
