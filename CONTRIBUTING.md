# Cómo trabajamos Gael y Ricardo

Este repo es el tronco de los dos. **Lo que está en `main` es lo único que llega a producción.** Nada se sube a la app desde otra copia ni desde un fork: así nunca se pierde algo al juntar dos versiones (en la v9 se perdieron los bloques de enfoque y las etiquetas NFC justo por eso).

Los links exactos están en el [README](README.md#dónde-trabajamos-los-únicos-links).

## La semana, siempre igual

| Cuándo | Qué pasa |
|---|---|
| **Lunes** | Cada quien abre la [lista](https://github.com/GaelProspectlab21/bambu-abierto/issues), elige **una o dos** cosas y se las asigna. Lo asignado al otro no se toca. |
| **Martes a sábado** | Rama, cambios, PR. El otro revisa en **menos de 48 horas**. |
| **Domingo** | Lo que entró a `main` en la semana se publica en producción. Un mensaje de 3 líneas al otro: qué salió, qué aprendimos, qué sigue. |

Un bug que rompe algo que ya usamos (no se puede registrar, se pierde un dato) no espera al domingo: PR con la etiqueta `urgente`, el otro lo revisa ese día y sale ese día.

## Un cambio, en 5 pasos

1. **Rama nueva desde `main`** con tu nombre: `ricardo/duelos-con-amigos`, `gael/noche-nueva`. Nunca trabajes directo en `main` (está protegida).
2. **Cambios chicos.** Una idea por rama. Si tu rama toca más de 20 archivos, probablemente son dos ideas.
3. **Pruebas antes de subir:** `node checks/features.cjs` y `pnpm build`. Si agregas lógica, agrega su prueba y comprueba que falla cuando rompes la lógica a propósito.
4. **Pull request** con la plantilla: qué cambia, por qué y una captura del iPhone si se ve distinto. GitHub corre las pruebas y Vercel deja un link de prueba en el PR.
5. **El otro abre el link de prueba en su teléfono, lo usa y aprueba.** Nadie fusiona su propio PR sin el visto bueno del otro.

## Terminado quiere decir

- Las pruebas pasan (GitHub las corre solo).
- Lo probaste en el link de prueba en un iPhone, también con texto grande o pantalla angosta.
- Si quitaste o moviste una pantalla, todas las de antes siguen teniendo un botón para llegar a ellas.
- Si cambiaste `model.ts`, `records.ts`, `nfcActions.ts` o `stretch.ts`: corriste `pnpm build:remind` y lo avisaste en el PR (hay que redesplegar las funciones del servidor).

## Antes de agregar algo nuevo

Pásalo por las tres reglas de [producto/ANALISIS_V9.md](producto/ANALISIS_V9.md):

1. ¿Mide sin escribir (un toque, cámara, NFC)?
2. ¿Ayuda a responder "¿cómo voy hoy?" en una sola pantalla?
3. ¿Usa la moneda que ya existe o inventa otra?

Si la respuesta a la 3 es "inventa otra", platíquenlo antes de construir.

## Decisiones tomadas (no se reabren sin dato nuevo)

| Decisión | Por qué |
|---|---|
| Una sola nube: **Supabase** | Ahí viven las cuentas, el historial, NFC, avisos y las pruebas de aislamiento. Dos nubes no se pueden auditar entre socios. |
| Amigos **solo por código exacto**, perfil privado por defecto | La mayoría de usuarios son menores de edad. |
| Entrenar en **3 pestañas** (Rutina, Redes, Retos) | Cinco pestañas confunden. Aventura está apagada, no borrada. |
| La rutina de inicio es de **principiante y sin candado** | El primer día se siente bienvenida, no regaño. |
| Una sola CSP (`vite.config.ts`, copiada en `vercel.json`) | Dos políticas se suman y rompen la cámara. La prueba `csp unica` lo vigila. |

Las demás reglas fijas (comida para menores, coach de fuerza, celebraciones solo por lo ganado, texto sin guion largo) están en [AGENTS.md](AGENTS.md).

## Lo que nunca va en este repo

Contraseñas, claves, tokens, correos personales ni datos de usuarios. Las claves viven en `.env` local (ignorado por git). Si subes una por error: avísale al otro, revócala y genera otra; borrarla del repo no basta.
