# Auditoría v10: una sola app, no dos pegadas

26 nov 2026. Recorrido completo como usuario nuevo, en el teléfono (390 px), sección por sección.

## El problema de fondo

La v9 tenía **dos sistemas de diseño a la vez**:

- **La carcasa de Kiki** (barra de arriba, menú, Hoy, Tareas, Jardín, Ajustes). Usaba los colores **exactos** de Duolingo (`#58cc02`, `#1cb0f6`, `#ffc800`, `#ff4b4b`, `#ce82ff`).
- **Las páginas originales** (Entrenar, Comida, Lectura, Noche). Seguían en verde menta, con letra delgada y botones planos.

Por eso Bambú se sentía como "la app de Ricardo con parches". Copiar la paleta de otra marca, además, es riesgo de imitación al subir a la App Store.

## Lo que se arregló

| # | Qué | Antes | Ahora |
|---|---|---|---|
| 1 | Paleta | Hex de Duolingo | **Paleta Bambú**: verde bambú, sol, brasa, cielo y fondo verde noche (`tokens.css`) |
| 2 | Un solo diseño | Las páginas viejas en menta | `src/bambu.css` reasigna los tokens viejos y todas las páginas heredan el mismo look |
| 3 | Voz visual | Botones en MAYÚSCULAS espaciadas (firma de Duolingo) | Botones en minúscula normal y títulos en Fraunces suave |
| 4 | Camino de Hoy | 3 días bloqueados que repetían los mismos 5 nodos | Una tarjeta corta: "Mañana · Pierna · 5 pasos" |
| 5 | Entrenar | Encabezado gigante y dos filas de pestañas del mismo peso | Sin encabezado repetido, sub-pestañas como chips y el plan antes que el estiramiento |
| 6 | Lectura | A un usuario de su primer día le decía "13 días en blanco" | Cuenta solo desde que empezaste a usar Bambú |
| 7 | **Privacidad** | Ajustes tenía un botón que mandaba TODOS tus datos a `tuagentedeia.com` | Eliminado. La imagen para compartir y el aviso de cámara ya no anuncian otro dominio |
| 8 | Biblia | Solo se podía prender en el onboarding | Interruptor en Ajustes, "Qué usas" |
| 9 | Noche | El botón flotante tapaba el texto | Con espacio abajo y sombra |
| 10 | Plural | "1 cosas" | "1 cosa" |

La prueba **`identidad v10`** de `checks/features.cjs` vigila los puntos 1, 2 y 7. Falla si vuelve un hex de Duolingo, si aparece un color suelto en `bambu.css` o si Ajustes manda datos a otra ventana. Se comprobó rompiéndolo a propósito.

## Ingeniería inversa: qué tomamos de quién

- **De Kiki:** la estructura. Botones con relieve que se hunden al tocar, el camino del día, la mascota, el modo oscuro y la cámara que cuenta.
- **De la versión original:** la identidad. El verde bambú, el sol para el logro, la brasa para el compromiso, Fraunces en los títulos y el coach de fuerza.
- **Lo que NO copiamos de Duolingo:** colores, mayúsculas gritadas y un camino infinito de días bloqueados.
- **Lo que nos hace distintos:** los tres anillos (Cuerpo, Mente, Alma) en lugar de una barra de XP, y el jardín de bambú.

## Lo que queda (en orden)

1. **Amigos y duelos:** el servidor está listo, falta aplicar la migración (`docs/V9_SOCIAL.md`).
2. **Entrenar** sigue con 5 sub-pestañas (Hoy, Recuperación, Progreso, Coach, Ejercicios). Propuesta: dejar 3 (Hoy, Progreso, Ejercicios) y mover Recuperación y Coach dentro de Progreso.
3. **Lectura y Noche** no están en el menú de abajo; se llega desde Hoy. Está bien mientras el camino sea la puerta, pero hay que decidirlo.
4. **Revisión fina pendiente:** los textos largos de las páginas viejas siguen en el tono anterior.
5. **Chunk de 500 kB:** la cámara (MediaPipe) debería cargarse solo al abrir Redes o Retos.

## Regla para lo que venga

Colores solo en `tokens.css`. El look solo se decide en `bambu.css`. Una página nueva usa `d-card` y `d-btn` (o `.card` y `.primary-button`, que ya se ven igual). Antes de decir "ya se ve bien", hay que recorrer **todas** las secciones con `?ir=comida`, `?ir=lectura`, `?ir=noche` y `?ir=entrenar`, no solo Hoy.
