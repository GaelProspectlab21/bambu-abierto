# bambú

**Mide tu día en segundos para poder mejorarlo.** Una sola app para el cuerpo, la mente y el alma: entreno con cámara que cuenta repeticiones, lectura y Biblia sin señal, hábitos, tareas, comida y una noche para preguntarte si diste lo que traías.

Hecha por Gael y Ricardo (Kiki).

## Dónde trabajamos (los únicos links)

| Qué | Link | Para qué |
|---|---|---|
| **El repo** | https://github.com/GaelProspectlab21/bambu-abierto | El único lugar del código. Todo cambio entra por PR a `main`. |
| **La lista** | https://github.com/GaelProspectlab21/bambu-abierto/issues | Bugs e ideas. Si no está aquí, no existe. |
| **Revisión** | https://bambu-v9-revision.vercel.app | Siempre muestra `main`. Modo sin cuenta, no toca datos reales. Cada PR además recibe su propio link de prueba (Vercel lo comenta en el PR). |
| **Producción** | https://bambu-personal-gael.vercel.app | La app que usamos. Solo recibe lo que ya está en `main`. |

| | |
|---|---|
| Por qué es así | [producto/ANALISIS_V9.md](producto/ANALISIS_V9.md): análisis, 10 apps investigadas y decisiones |
| Cómo trabajamos | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Lo que hizo Kiki y cómo | [producto/kiki/](producto/kiki/) (describe su versión con Firebase; la v9 ya usa Supabase) |

## Lo que tiene la v9

- **Hoy:** un camino de nodos estilo Duolingo y tres anillos arriba (Cuerpo, Mente, Alma) que dicen cómo vas de un vistazo.
- **Entrenar:** Rutina, Redes y Retos. La cámara cuenta repeticiones en el teléfono (MediaPipe, el video nunca sale) y las repeticiones de Redes compran minutos de redes sociales.
- **Lectura y Biblia:** cronómetro, libros y los 73 libros católicos sin señal.
- **Noche:** la vara del día, cuánto diste contra lo que traías.
- **Comida, tareas, hábitos, NFC, pausa antes de las apps y avisos push.**
- **Amigos y duelos:** código listo en Supabase (`src/lib/nubeSocial.ts`), apagado hasta aplicar su migración.

## Stack

React 19, Vite 8, TypeScript, **pnpm**. Datos primero en el teléfono (IndexedDB) y sincronizados con Supabase (`bambu_records`, gana el cambio más reciente). Sin variables `VITE_SUPABASE_*` corre en modo local, sin cuenta.

```bash
pnpm install --frozen-lockfile
pnpm dev                    # modo local
node checks/features.cjs    # pruebas de la lógica: tienen que pasar
pnpm build                  # tiene que pasar
```

Reglas para agentes y para humanos: [AGENTS.md](AGENTS.md).
