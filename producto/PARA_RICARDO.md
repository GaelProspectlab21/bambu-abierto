# Para Ricardo: Bambú al 27 de noviembre (v11.3)

Todo lo tuyo hasta `4c6395b` (rama `kiki` de tu fork) ya está unido aquí y en producción: https://bambu-personal-gael.vercel.app

## 1. Cómo trabajar a partir de hoy

- **Trabaja en ramas de `bambu-abierto`, no en tu fork.** Rama nueva desde `gael/v11-debug` (o desde `main` cuando se fusione), PR hacia esa rama. Así Gael lo integra con un merge, sin parches a mano.
- Antes de abrir el PR: `pnpm build` y `node checks/features.cjs` tienen que pasar (hoy son 105 grupos). Si agregas lógica, agrega su prueba.
- **Ya no hay Firebase.** Todo vive en Supabase: `src/lib/nube.ts` (datos) y `src/lib/nubeSocial.ts` (amigos, retos, widget, pases). Si necesitas algo del servidor, va como tabla con RLS y RPC en `supabase/migrations/`.
- Tu `avisarFinPase` se portó al servidor: el cron de avisos (`bambu-remind`, cada 5 min) lee `settings.candado.hasta` y avisa al acabar el pase. Se cancela solo con "Ya terminé" o "Devolverme los minutos".

```bash
pnpm install --frozen-lockfile
pnpm dev                    # sin variables VITE_* corre en modo local, sin cuenta
pnpm build                  # tsc + vite
node checks/features.cjs    # pruebas de lógica
node scripts/dibuja_marca.cjs   # regenera los SVG de Brote, rangos y pantallas de error
```

## 2. Lo que cambió desde tu versión

| Qué | Dónde |
|---|---|
| Brote nuevo: caña cortada a machete, banda anudada, expresión en las cejas (sin cachetes ni brillo) | `src/BroteArt.tsx` |
| Rangos dibujados en código (semilla a bosque), sin imágenes de IA | `src/RangoArt.tsx`, `public/img/rango-*.svg` |
| Ícono crema dibujado a mano y nombre en Fraunces | `public/icon.svg`, `.d-auth-nombre`, `.side .brand` |
| Tareas: sapo del día (+20 XP), tablero semanal, el bloque muestra primero hoy y mañana | `src/lib/tareas.ts`, `src/Sapo.tsx`, `src/TareasSemana.tsx` |
| Anillos con detalle: Cuerpo, Mente y Hábitos (antes Alma) dicen qué cuenta | `src/lib/anillos.ts` (`detalleAnillos`) |
| La Biblia ya no es paso del camino: leer es leer. Su pestaña sigue en Lectura | `src/HoyLista.tsx` |
| Lectura por NFC sin duplicados (Terminar actualiza la fila del cronómetro) | `src/lib/lectura.ts` |
| Despertador de lagartijas, cámara con GPU, 468 alimentos, bienvenida nueva | `producto/V11_DEBUG.md` |

## 3. Reglas de la marca (para que todo se vea de la misma app)

- **Colores solo desde tokens** (`src/tokens.css`, reasignados en `src/bambu.css`). Verde bambú para lo principal, **sol (dorado) para la acción secundaria**, brasa para alertas. **Nada de azul de Duolingo**: los `d-btn blue` ya se pintan de sol.
- **Brote es el único personaje.** Úsalo con `<BroteArt mood look size />`. Moods: feliz, orgulloso, sueno, animo, calma, susto, sinSenal. Looks: base, coach, lector, tareas, habitos, noche, historial, ajustes. Si lo cambias, corre `dibuja_marca.cjs` para que los `<img>` también cambien.
- **Nada de imágenes hechas con IA.** Si hace falta una ilustración, se dibuja en SVG con el mismo trazo (tinta `#151515`, colores planos, filtro de borde tembloroso).
- Títulos en Fraunces (`var(--title)`), texto en Nunito.
- **Puntuación humana en todo texto visible:** sin guion largo, sin " - " como conector, sin barra entre palabras, sin puntos suspensivos.
- Revisa en 1366, 390 y 320 px. En laptop, Lectura y Tareas usan 1080 px de ancho (`data-seccion` en `.page`); lo demás sigue en columna.

## 4. Trampas que ya nos mordieron

- **Si tocas `model.ts`, `personal.ts`, `records.ts`, `nfcActions.ts` o `reminders.ts`:** `pnpm build:remind` y Gael redespliega `bambu-nfc`, `bambu-remind` (y `bambu-llave` si tocas su formato). El servidor tiene su propia copia del modelo y borra lo que no conoce.
- **Aviso nuevo en `reminders.ts`:** agrégalo también al "paso barato" de `runCron` en `bambu-remind/index.ts`, o nunca sale.
- **Campo nuevo del widget:** agrégalo a la lista de `supabase/functions/bambu-llave/formato.ts`; si no, el servidor lo filtra.
- Cambiar la forma de un dato sin aceptar la vieja rompe el iPhone de Gael, que trae una copia guardada.

## 5. Ideas listas para tomar (de más a menos valor)

1. **Aviso del sapo en la mañana:** "¿Cuál es tu sapo de hoy?" a la hora de despertar si no hay sapo elegido (`reminders.ts` + paso barato del cron).
2. **El sapo en el widget:** una línea con el sapo del día o "sapo comido".
3. **Arrastrar en el iPhone dentro del tablero semanal** (hoy es tocar la tarea y tocar el día; en laptop ya se arrastra).
4. **Afinar la cámara con cuerpos reales** (umbrales en `src/CamaraReps.tsx` y `src/lib/conteo.ts`). Solo se ha probado con la cámara falsa de Chrome.
5. **Mapa de músculos a 320 px:** las etiquetas de series quedan fuera de la pantalla (`src/Musculos.tsx`).
6. **Libros en laptop:** cuando haya varios, tarjetas a dos columnas al lado del formulario.

Pendiente que no es de código: los datos del responsable en el aviso de privacidad (nombre, domicilio, correo) y la protección de contraseñas filtradas (plan Pro de Supabase).
