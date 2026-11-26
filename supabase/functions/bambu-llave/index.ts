import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { consultaLlave, salidaLlave } from './formato.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'X-Content-Type-Options': 'nosniff',
}

Deno.serve(async req => {
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'GET') return reply(405, {})
  const consulta = consultaLlave(req.url)
  if (!consulta) return reply(404, {})
  try {
    const { tipo, llave } = consulta
    const { data, error } = await db.from(tipo === 'pase' ? 'bambu_pases' : 'bambu_widget')
      .select(tipo === 'pase' ? 'hasta' : 'estado').eq('llave', llave).maybeSingle()
    if (error) return reply(503, {})
    const body = data && salidaLlave(tipo, data as unknown as Record<string, unknown>)
    return body ? reply(200, body) : reply(404, {})
  } catch {
    // No registrar la URL, la llave ni la respuesta de Supabase.
    return reply(503, {})
  }
})
