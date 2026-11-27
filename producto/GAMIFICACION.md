# El juego de bambú

26 nov 2026. Propuesta para Gael y Ricardo. Se discute en el PR, no se construye entera de golpe.

## En una frase (la que entiende un niño de 5 años)

> **Cierra tus 3 círculos. Si todavía te queda, hazlos de oro. Con tus amigos, gana quien junte más círculos en la semana.**

Si una regla nueva no cabe en esa frase, no entra.

## El problema que arregla

Hoy bambú tiene **11 monedas**: XP (con dos tablas distintas), niveles, rangos, racha, anillos, cofre del día, repeticiones de duelo, minutos de redes, aventura, jefe y mazmorra. Cada una tiene su regla. Nadie las recuerda, y cuando todo da puntos, ningún punto emociona.

Duolingo se ve como un juego de mil cosas, pero por dentro es **una sola**: no rompas tu racha. Todo lo demás le sirve a eso. Copiamos esa idea, no sus colores: **una sola cosa importa, los tres círculos**.

## Las 3 piezas

### 1. Los círculos (ya existen)

Cuerpo, Mente y Alma. Cada uno se cierra con lo que tú elegiste medir. Ya están arriba en Hoy.

### 2. El 40% y el oro (lo nuevo, lo retante)

Goggins: cuando tu cabeza dice "ya acabé", te queda 40%.

- En el momento en que **cierras** un círculo, aparece un botón: **"¿Te queda 40%?"** con UN extra concreto y chico para ese círculo:
  - Cuerpo: *una serie más* o *10 minutos más caminando*.
  - Mente: *10 minutos más de lectura* o *una tarea más*.
  - Alma: *un capítulo más* o *un hábito más*.
- Lo haces, tocas **"Hecho"** y ese círculo se vuelve **de oro**.
- Se pide **justo al terminar**, no en la mañana: el reto es ir más allá cuando ya cumpliste, no ponerte una meta más alta desde el inicio.
- Un círculo de oro al día, máximo uno por círculo. Si no quieres, no pasa nada: el círculo cerrado ya cuenta completo.

Por qué funciona: el reto siempre es **un paso más de lo que hiciste hoy**, así que sirve igual al que entrena mucho que al que apenas empieza. Nadie se compara contra un número fijo.

### 3. La semana con amigos (lo social)

- Hasta **5 amigos**, solo por código (la mayoría somos menores de edad; nada de buscar gente).
- Cada círculo cerrado = **1 punto**. Cada círculo de oro = **2 puntos**. Máximo 6 al día, 42 a la semana.
- La tabla de la semana se ve en una sola pantalla y **se reinicia cada lunes**. Así el que perdió esta semana arranca igual la siguiente.
- **Domingo en la noche**: el resultado, con animación para el que ganó y para el que más mejoró contra su semana anterior (dos ganadores: así el que va abajo también tiene por qué pelear).
- Lo único que ven tus amigos: tu nombre, tus puntos y cuántos círculos de oro hiciste. Nunca qué leíste, cuánto pesas ni tus tareas.

Es justo entre amigos de distinto nivel porque cada quien cierra **sus** círculos con **sus** metas.

## La dopamina, sin tragamonedas

Regla de la casa (AGENTS.md): se celebra lo ganado, **nunca premios al azar**. Lo que sí da gusto volver:

| Momento | Qué pasa |
|---|---|
| Cierras un círculo | El círculo se llena con sonido y vibración corta. |
| Lo haces de oro | Animación distinta, brillo dorado. Es raro, por eso emociona. |
| Cierras los 3 | Celebración grande del día (ya existe). |
| Domingo | Resultado de la semana contra tus amigos. |
| Lunes | Tabla nueva, todos en cero. |

## Qué pasa con las otras monedas

Propuesta, **la deciden los dos en el PR**:

- **Se quedan**: racha (días seguidos con al menos un círculo cerrado) y niveles (salen de los puntos de toda la vida).
- **Se apagan** (no se borran, igual que Aventura): cofre del día, jefe, mazmorra, XP visible arriba. Arriba queda: racha, puntos de la semana y nivel.
- **Duelos de repeticiones**: se quedan como reto entre dos, pero su resultado da puntos de la semana en vez de XP.

## Cómo se construye (en orden, un PR por paso)

1. **El 40% y el oro**, solo personal. Sin servidor nuevo: el extra se guarda como actividad con nota `Extra: cuerpo` (mismo truco que el Rescate, no cambia la forma de los registros).
2. **Puntos de la semana** en Hoy, solo tuyos. Medimos 2 semanas: ¿subió la cantidad de días con los 3 círculos cerrados?
3. **Amigos y tabla semanal.** Necesita aplicar la migración social en Supabase (ya está escrita y probada, `supabase/migrations/20261126000000_bambu_social.sql`), cambiando duelos por la tabla. Lo aprueba Gael porque toca datos de menores.
4. **Apagar monedas** según lo que decidan aquí.

## Cómo sabremos si funcionó

Una sola cifra: **días con los 3 círculos cerrados por semana**, antes y después. Si no sube en 3 semanas, el juego no sirve y se cambia, no se le agregan más cosas.
