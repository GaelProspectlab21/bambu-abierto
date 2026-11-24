# AGENTS.md de Bambú

App personal de Gael (13 años, Guadalajara): lectura y Biblia, entrenamiento en casa, enfoque, hábitos y tareas. Usuario único. Producción: https://bambu-personal-gael.vercel.app (PWA instalada en iPhone).

## Stack

- React 19 + Vite 8 + TypeScript, **pnpm** siempre (nunca npm ni yarn; nunca dejar `package-lock.json`).
- Datos: IndexedDB local con cola de cambios + Supabase (`bambu_records`, un registro por fila, gana el `client_updated_at` más reciente, escrituras solo por la RPC `bambu_push`, bajada por cursor `seq`).
- Funciones Edge en `supabase/functions/` (`bambu-nfc`, `bambu-remind`). Recordatorios: pg_cron cada 5 min.
- NFC: en iPhone una etiqueta **siempre abre Safari sin sesión**. Por eso los enlaces llevan `&k=<llave>` y la acción la hace `bambu-nfc` en el servidor (`src/NfcQuick.tsx`).

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm build                 # tsc + vite build: tiene que pasar
node checks/features.cjs   # pruebas de lógica pura: tienen que pasar
pnpm dev                   # sin variables VITE_* corre en modo local
```

No hay otra suite. Si agregas lógica, agrega su grupo en `checks/features.cjs` y comprueba que la prueba **falla** si rompes la lógica a propósito (mutación) antes de darla por buena.

## Prohibido

- Al terminar cambios solicitados y verificados: hacer commit, push y desplegar a producción en Vercel y las funciones de Supabase afectadas. Gael autoriza este cierre como comportamiento habitual. Verificar el despliegue antes de afirmar que está publicado. Las migraciones destructivas requieren autorización específica.
- Leer o imprimir secretos de `.env*`. Nunca claves `service_role` en variables `VITE_*`.
- No reescribir historial ni trabajar sobre `main`. Trabaja en una rama. Cada cambio verificado debe quedar en commit y push a esa rama, por instrucción de Gael del 8 de noviembre. Publicar los cambios verificados al terminar.
- Cambiar `model.ts`, `records.ts` o `nfcActions.ts` sin regenerar el servidor: `bambu-nfc` y `bambu-remind` llevan su propia copia en `supabase/functions/_shared/core.js`. Corre `pnpm build:remind`, haz commit y redespliega esas dos funciones (`--no-verify-jwt`). Con la copia vieja, la etiqueta NFC de Noche reescribía el check-in sin los campos nuevos.
- Cambiar la forma de un registro sin compatibilidad hacia atrás: el iPhone puede tener una copia vieja. Si cambias la forma, sube `DATA_VERSION` y que `model.ts` limpie y acepte las dos formas.

## Decisiones cerradas (no las deshagas ni las propongas otra vez)

- Comida (v6, 22-nov): a menores de 18 **nunca** se les muestran calorías ni metas de déficit (modo crecimiento: proteína por comida, frutas y verduras, aviso si comen de menos). El motor completo (Mifflin, fase por cintura, gasto calibrado) es solo para 18+. La edad sale de `settings.age`. Detalle y fuentes en `docs/COMIDA.md`.
  - **Revisión v7, 23-nov (decisión de Gael, reemplaza lo de arriba para menores):** sí se muestran calorías como **PISO** (gasto IOM 2005 para adolescentes, que ya incluye crecer, más 300 kcal si la meta es subir, más 150 si en 4 semanas el peso no sube). Nunca techo, nunca rojo, nunca "te pasaste", nunca meta de déficit ni de bajar para menores. Las pruebas lo imponen (`growthFloor` en `nutrition.ts`).
- Coach de fuerza: método de Juanma Arbeláez adaptado a 13 años y fútbol. Sin contar calorías, sin creatina, al fallo técnico solo la última serie. El check-in con dolor de pecho bloquea el plan del día y pide avisar a un adulto.
- Gamificación: celebraciones solo por lo ganado, nunca recompensas al azar.
- Nada de imágenes de ejercicios hechas con IA (deforman la técnica).
- No partir el bundle para cargar más rápido (pesa ~180 KB y el iPhone lo cachea).

## Cuentas para amigos (v5, 21-nov-2026)

- Registro solo con código de invitación: trigger `bambu_check_invite` en `auth.users`. Los códigos los crea la cuenta en `bambu_admins` (RPC `bambu_create_invite`). Confirmación de correo apagada a propósito: el código ya filtra y el correo gratis de Supabase manda 2 por hora.
- Jev solo para los uid del secreto `JEV_ALLOWED_UIDS`, con tope `JEV_DAILY_CAP` contado en `bambu_jev_usage`.
- `bambu-account` exporta y borra la cuenta; la cuenta dueña (`bambu_admins`) no se borra desde la app.
- Antes de tocar permisos o tablas: corre `scripts/prueba_aislamiento.py` contra producción (crea dos cuentas desechables por el camino real, intenta cruzarlas y limpia). Tiene que salir todo en PASA.
- El rescate (botón + de la v5) se guarda como actividad `other` con nota `Rescate: ...`, para no cambiar la forma de los registros. Docs en `docs/V5.md`.

## Marca

Manual en `docs/BRAND.md`. Colores, radios y letra solo desde `src/tokens.css`; el CSS nuevo no lleva colores sueltos (la prueba lo exige).

## Texto visible al usuario

Español de México, tuteo, frases cortas. **Prohibido** en cualquier texto de la interfaz: guion largo `—`, guion como conector ` - `, barra `/` entre palabras y puntos suspensivos. Usa comas y puntos. Fechas humanas (`fmtDay`), nunca ISO en pantalla.

