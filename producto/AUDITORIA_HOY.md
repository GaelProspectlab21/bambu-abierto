# Auditoría final de Hoy

26 nov 2026. Hoy revisado en el código y en vivo: usuario nuevo, usuario con 220 días de historial, con la Biblia prendida y apagada, de noche, y en 320 px (iPhone con Zoom de pantalla), 375, 390 y laptop de 1366 px. Un revisor automático buscó textos fuera de pantalla, textos recortados, elementos encimados y errores de consola. Antes de confiar en él, se comprobó que sí detecta un choque real.

## Lo que estaba mal y ya se arregló

| # | Qué pasaba | Por qué | Arreglo |
|---|---|---|---|
| 1 | El cofre decía "+20 XP al 80%" pero solo se abría al 100% | El cofre usaba "todos los pasos hechos" y los XP usaban el 80% | El cofre se abre con la misma regla del 80% que da los XP y prende la racha |
| 2 | Brote decía "Vas 3 de 9" y el camino tenía 6 pasos | Brote contaba unidades internas (cada hábito y cada tarea) | Brote cuenta los pasos que ves en el camino |
| 3 | El letrero "¡BUENOS DÍAS!" chocaba con el globo de Brote | Los dos arriba del mismo paso | Brote baja 30 px |
| 4 | El nodo Biblia te mandaba a otra pantalla | Venía de antes del registro rápido | Abre "¿Leíste?" con La Biblia ya elegida |
| 5 | El círculo de oro brillaba pero su punto en la leyenda seguía azul | Faltaba pasarle el oro a la leyenda | El punto también se vuelve dorado |
| 6 | Los versículos al pie no salían en ninguna página | La v9 desconectó el componente | Regresan, alternados con citas con fuente |
| 7 | En Ajustes no estaban las etiquetas de Estiramiento, Enfoque, Buenos días ni Noche | Ajustes tiene su propia lista fija, distinta de `nfc.ts` | Agregadas |

Resultado final del revisor: **0 desbordes, 0 recortes y 0 encimados** en 320, 375, 390 y 1366 px. **0 errores de consola** con usuario nuevo.

## Lo que queda para decidir entre los dos

1. **Hoy mide el día de tres formas.** Los círculos (Cuerpo, Mente, Alma), la racha de arriba (días con 80% de hábitos, rutina y tareas, sin contar la lectura) y el camino ("vas 2 de 7"). Por eso alguien con 220 días leyendo ve la flama en 0. Propuesta del juego: una sola medida, los círculos, y la racha = días con al menos un círculo cerrado. Issue #6.
2. **Los días pasados arriba del camino** (antier y ayer) empujan Hoy hacia abajo; la app hace scroll sola, pero en laptop se siente largo. Se podría dejar solo "ayer" en una tarjeta corta, como ya se hizo con "mañana".
3. **Componentes que nadie usa** desde la v9: `QuickLog` (el botón + de registro en un toque), `SettingsPage`, `TasksHub`, `PersonalPages`. Decidir si se borran o se reconectan. El + era de lo más rápido para registrar.

## Cómo se repite esta auditoría

1. Datos de prueba grandes en modo sin cuenta (220 días, nombres largos, tareas largas).
2. Revisar Hoy en 320, 375, 390 y 1366 px buscando: textos fuera, recortados y encimados.
3. Lista de pantallas de antes: cada una debe tener un botón para llegar a ella.
