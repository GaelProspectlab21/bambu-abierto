# Bambú

> **Versión de Kiki** (rama `kiki`): en vivo en https://tuagentedeia.com/bambu/ con cámara que cuenta repeticiones, minutos de redes, duelos, Cindy, widget y avisos. Documentación en [docs/kiki/](docs/kiki/). La versión original de Gael está en la rama `main`.

Aplicación personal para lectura, hábitos, fuerza en casa y bloques de enfoque. La interfaz guarda una copia local y, cuando se configura una cuenta privada, sincroniza datos con Supabase mediante HTTPS.

## Acceso personal en producción

https://bambu-personal-gael.vercel.app

El registro público está cerrado. En el primer acceso, usa Olvidé mi contraseña con el correo autorizado y elige una contraseña desde el enlace recibido. Puedes instalarla desde el navegador con Añadir a pantalla de inicio.

Verificado en producción: acceso privado, aislamiento entre cuentas, guardado de hábitos, persistencia tras recarga, conservación de los IDs del historial importado, Ajustes en móvil, apertura sin conexión después de la primera visita y formulario de creación de contraseña desde recuperación.

## Funciones (v3)

- **Lectura:** cronómetro con pausas y audio binaural, Biblia por capítulos (1,189, ruta de 11 etapas de Códice, proyección de fin), libros con páginas y la Crónica día por día.
- **Entrenamiento:** coach con el método de Juanma Arbeláez (torso y pierna, 2 series duras, doble progresión) adaptado a 13 años y fútbol. Registro de series con el pulgar, descanso con campana, recuperación por músculo, check-in diario, peso y plan de masa. Cada consejo cita el video de Juanma.
- **Enfoque:** el flujo de Cauce: nivel 1 a 4, ritual, pausas con motivo, capturas, cierre con lo logrado, foco y qué mejorar, veredicto semanal.
- **Hábitos** editables, con marcado automático por lo que registras. **Tareas** con lista, tablero y calendario.
- **Recordatorios push** (check-in, entrenar, leer, dormir y foto mensual) que solo suenan si falta: pg_cron cada 5 min llama a `supabase/functions/bambu-remind`, que decide con `src/lib/reminders.ts` empaquetado (`pnpm build:remind`). En iPhone solo con la app instalada en la pantalla de inicio.
- **NFC** para lectura, entrenamiento, enfoque, check-in, báscula y cualquier hábito. Ver [docs/NFC.md](docs/NFC.md).

## Backend

Cada lectura, serie o tarea es una fila de `bambu_records` (RLS forzado, solo lectura para `authenticated`; las escrituras pasan por `bambu_push`, que gana el cambio más reciente). El cliente guarda una cola de cambios en IndexedDB que sobrevive a recargas y sin conexión, sube por lotes y baja lo nuevo por cursor. El JSON viejo `bambu_user_data` queda como respaldo de solo lectura.

Pruebas: `node checks/features.cjs` y `pnpm build`. Historial de Cauce y Códice: `python -X utf8 scripts/migrar_historial.py --dry-run` (idempotente).

## Desarrollo local

1. Instala Node.js y Corepack.
2. Copia `.env.example` a `.env.local`.
3. Para nube, apunta las dos variables a un proyecto Supabase dedicado a Bambú. Sin ellas, Vite funciona en modo local.
4. Ejecuta `pnpm install --frozen-lockfile` y `pnpm dev`.

Nunca pongas claves secretas ni `service_role` en variables `VITE_*`. El publishable key es visible en el navegador; su seguridad depende de Auth, permisos mínimos y RLS.

## Preparar Supabase

1. Crea un proyecto separado para Bambú. No uses el proyecto de Cauce.
2. Aplica `supabase/migrations/20261102120000_bambu_cloud_data.sql` con Supabase CLI, después de verificar que vinculaste el proyecto correcto.
3. Ejecuta `supabase test db` y `supabase db advisors` antes de desplegar.
4. En Auth, mantén desactivados los registros públicos, exige confirmación de correo y usa una contraseña larga. Invita únicamente la cuenta autorizada desde el panel. Activa MFA para la cuenta administradora del proyecto.
5. Configura Site URL y Redirect URLs con el dominio HTTPS final, además de localhost para desarrollo.
6. Activa protección contra contraseñas filtradas si está disponible y limita los proveedores a correo y contraseña.
7. En la plataforma de despliegue define `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` para Production. Para Preview usa un proyecto de pruebas separado o deja la app sin credenciales. Vuelve a construir después de añadirlas.

El acceso a filas está limitado por `auth.uid()`. El navegador solo puede leer su fila; las escrituras pasan por una función RPC con revisión optimista. La función valida la sesión, la estructura, el tamaño y rechaza revisiones obsoletas. No almacenes datos médicos, contraseñas, tokens ni información sensible de terceros aquí.

## Producción

`vercel.json` agrega CSP, HSTS y cabeceras de navegador. Si se aloja en otro servicio, replica esas cabeceras allí. Antes de publicar, configura el dominio y los redirects de recuperación, crea la cuenta privada, aplica la migración y prueba acceso, recuperación de contraseña, sincronización en dos sesiones y recuperación sin conexión. Los datos existentes se fusionan a la cuenta en el primer inicio de sesión de ese dispositivo; exporta un respaldo antes de la primera migración.

Bambú conserva cambios en el dispositivo cuando se cae la red. Esa copia depende del almacenamiento del navegador; usa Descarga de respaldo para tener una copia recuperable.
