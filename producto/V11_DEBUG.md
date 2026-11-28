# v11: debugeo masivo (27-nov-2026)

## 1. Lo que hacen las apps que facturan y qué copiamos

| App | Por qué factura | Qué copiamos | Qué NO copiamos |
|---|---|---|---|
| **Opal** (~5 M USD al año, pantalla) | Bienvenida tipo cuestionario: horas de cel, edad, ocupación, "reporte" con un dato que pega (años recuperados), compromiso, después el muro de pago. Fricción antes de abrir apps, gemas por logros, racha, amigos. En 2026 bajó su conversión de 20% a 9% al soltar el muro duro y crecieron los usuarios diarios. | Bienvenida personalizada: edad, horas de cel, reporte con años de vida frente a la pantalla, metas que encienden módulos, compromiso manteniendo presionado. La pausa antes de las apps ya existía (Atajos). | Muro de pago, cifras infladas, pedir reseña a media bienvenida. |
| **Alarmy** (despertador con misiones) | La alarma no se apaga hasta cumplir una misión (sentadillas con cámara, foto, cuentas) y revisa minutos después si te volviste a dormir. | Despertador de lagartijas con cámara y aviso cada 5 min durante una hora si no las haces. | Sonar con el teléfono bloqueado: una web no puede (iOS). Se resolvió con la alarma del iPhone y un Atajo. |
| **PushUp Time, Pushy y similares** | Ganar minutos de redes con ejercicio frente a la cámara. | Ya existía (minutos de redes de Ricardo); ahora la cámara es más fina. | |
| **Shaply** | No encontré una app con ese nombre que facture (sí Shapy, ~10 mil USD al mes, ejercicios con anuncios). Si era otra, pásame el nombre exacto. | | |

Fuentes: [RevenueCat, Opal 2026](https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026), [Opal en ScreensDesign](https://screensdesign.com/apps/opal-screen-time-control/), [Alarmy, misiones](https://alar.my/en/blog/how-to-choose-alarmy-mission), [Shapy en AppGoblin](https://appgoblin.info/apps/698172579).

## 2. Lo que cambió

- **Trabajo de Ricardo**: sus 15 commits del 25 y 26-nov (estaban en su fork, no en el repo compartido) unidos sobre la v10, con retos de grupo y caja de fallos portados de Firebase a Supabase.
- **Despertador de lagartijas** (`src/Despertador.tsx`, `src/lib/despertador.ts`): Atajo al detener la alarma, alarma propia que solo apaga la cámara, salida de emergencia de 3 s, modo sin cámara con ritmo mínimo, insistencia del servidor cada 5 min.
- **Cámara**: GPU con respaldo a CPU, aviso de poca luz, esqueleto con articulaciones que se pinta de oro al bajar completo, sonido por repetición y por la que no contó, terminar solo en la meta.
- **Sonidos**: repetición ascendente, no contó, cuenta regresiva, arranque, Biblia, Noche, comida, despertar y alarma.
- **Comida**: de ~100 a 468 alimentos (`src/lib/foodsMas.ts`).
- **Bienvenida personalizada** (`src/lib/bienvenida.ts`).
- **Más simple**: Entrenar Hoy solo con tu sesión (lo demás en Cuerpo y Método), 5 pantallas muertas fuera (513 líneas).
- **Visual**: recorrido de 10 secciones y sus subpestañas en 1366, 390 y 320 px: cero desbordes, cero errores de consola, cero puntuación prohibida. Arreglado: pestañas que se cortaban a 320 px, tarjeta de Hoy apretada, saludo con tu nombre.
- **Seguridad**: aislamiento 29 de 29 y retos 18 de 18 contra producción, vite sin vulnerabilidades, RPC vieja cerrada. Avisos del auditor de Supabase revisados (los de RLS sin políticas son intencionales).

## 3. Pendiente (de Gael o de dinero)

- Armar el Atajo del despertador en el iPhone (pasos en Ajustes, Despertar) y activar los avisos.
- Protección contra contraseñas filtradas: requiere plan Pro de Supabase.
- Probar la cámara con el cuerpo real en el iPhone (la prueba automática usa una cámara falsa).
