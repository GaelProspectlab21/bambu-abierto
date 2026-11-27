# Auditoría de mejoras, v10.3 (26 nov 2026)

Medido en producción y en local con Playwright. Cada punto trae su dato.

## Ya arreglado en esta tanda
| Qué | Dato | Arreglo |
|---|---|---|
| En laptop no sonaba el primer premio | La tarjeta de audio tardó 609 ms en despertar y la guarda tiraba todo después de 250 ms | El audio despierta con el primer toque en cualquier parte (`primeSounds`); guarda de 1200 ms con prueba |
| Marcas sin premio | Cerrar un bloque, el consejo de Brote y desmarcar en Tareas no hacían nada | Chispa y sonido al marcar, madera que baja al desmarcar |
| Errores de audio callados | `catch {}` vacío | Ahora avisa en consola |

## Pendiente, por prioridad

### 1. Probar el sonido en el iPhone (alto impacto, 5 minutos)
Lo verifiqué en Chrome real, no en un iPhone. Prueba: marca 5 cosas seguidas y oye cómo sube. Con el interruptor de silencio puesto no debe sonar nada.
Decidir con Ricardo: el sonido viene **encendido por defecto** también para los amigos.

### 2. CSS en 12 capas (alto impacto, esfuerzo medio)
3,285 líneas, 77 `!important`, 56 KB comprimido. `bambu.css` pisa a `duo.css`, que pisa a `v4.css` hasta `v8.css` y `app.css`. El arreglo de contraste de hoy necesitó `!important` porque cada capa le gana a la anterior. Así cada cambio visual cuesta más que el anterior.
Propuesta: fundir una pantalla por semana en `duo.css` y borrar su regla vieja. Empezar por Lectura y Noche, que todavía cargan restos del tema claro.

### 3. Cuatro componentes sin uso (medio, 10 minutos)
`QuickLog`, `SettingsPage`, `TasksHub`, `PersonalPages`. No pesan en el bundle (Vite los descarta), pero confunden: el interruptor de sonido vivía en `SettingsPage` y por eso nadie podía prender el sonido. Borrarlos con OK de Ricardo.

### 4. El número del bundle en AGENTS.md está podrido (medio, 2 minutos)
AGENTS.md dice "~180 KB". Hoy son 317 KB comprimidos (1.05 MB sin comprimir). Primera carga: laptop 0.5 a 0.8 s, celular medio con 4G 2.7 s; después el service worker la sirve local. No partir el bundle sigue siendo razonable, pero hay que corregir el número para que la decisión se tome con datos reales.

### 5. Brote no lee la paleta (medio, 30 minutos)
`Brote.tsx` tiene unos 50 colores escritos a mano (`#203c34`, `#225b46`, `#e9b949`), varios de la paleta v8. Si cambia la paleta, la mascota no se entera. Pasarlos a tokens `--d-*`.

### 6. Sonido: siguientes pasos (todos ganados, nunca al azar)
- **Pasaste a un amigo en la tabla:** un acorde corto la primera vez del día que subes de lugar.
- **Domingo, cierre de semana:** la frase de Bambú más larga al abrir el resumen semanal si la semana tuvo al menos un oro.
- **Volumen:** hoy solo hay encendido y apagado. Si en el iPhone se siente fuerte, agregar "suave" en Ajustes (un multiplicador de la ganancia maestra).

### 7. Colores del widget (bajo)
`src/lib/widget.ts` repite a mano el verde, oro y azul porque Scriptable no lee CSS. Está bien así, pero si cambian los tokens hay que cambiarlo también. Una prueba que compare ambos lo evitaría.

## Cómo se midió
- Sonido: `OfflineAudioContext` para niveles y tonos; AudioContext real con `OscillatorNode.start` contado para la prueba en vivo.
- Visual: 10 secciones en 390 y 320 px, contraste WCAG por elemento, desborde, texto cortado, fuentes y colores fuera de la paleta. Reloj fijo de día (de noche aparece la pantalla de dormir y el detector da cero fallos falsos).
- Carga: 3 cargas en frío de producción, laptop sin límite y celular emulado (CPU x4, 1.6 Mbps, 150 ms).
