# Bambú v9: análisis, investigación y lo que se unió

Para: Gael y Ricardo (Kiki). Escrito el 25 de noviembre de 2026.

## 1. Qué queremos lograr (en una frase)

**Una sola app que mida tu día en segundos, para que puedas mejorarlo.** Lo que no se mide no se mejora, pero medir no puede costar trabajo: si registrar algo toma más de 10 segundos, la gente deja de hacerlo a la semana.

De ahí salen tres reglas para decidir cualquier cosa:

1. **Medir sin escribir.** Un toque, una cámara, una etiqueta NFC. Teclear es el último recurso.
2. **Una sola pantalla responde "¿cómo voy hoy?".** Si tienes que abrir tres pestañas para saberlo, falló.
3. **Una sola moneda que importe.** Si hay XP, minutos, cartas, monstruos y rangos al mismo tiempo, nadie sabe qué perseguir.

## 2. Los cambios de Ricardo

Ricardo hizo en 2 días 24 publicaciones, 99 archivos y 72 grupos de pruebas. Lo de abajo es la revisión honesta, primero como consultor y luego como alguien que abre la app por primera vez.

### Como consultor

**Lo que es oro (se queda tal cual o casi):**

| Cambio | Por qué vale |
|---|---|
| **El camino de Hoy** estilo Duolingo | Convierte el día en una ruta con un siguiente paso obvio. Es la mejor decisión de diseño de toda la versión. |
| **La cámara que cuenta repeticiones** | Es literalmente nuestra regla 1: medir sin escribir. Con medidor de profundidad (media repetición vale cero) y todo en el teléfono, sin subir video. |
| **Minutos de redes ganados con ejercicio** | Es el gancho para vender. Hay un mercado probado (abajo, Pushscroll y sus clones) y un problema que los papás y los chavos ya sienten. |
| **El código por dentro** | La sincronización quedó con una interfaz limpia (`Remote`): cambiar Firebase por Supabase fue un adaptador de un archivo, no una reescritura. Pruebas, documentación y revisión de seguridad. Eso es de alguien que sabe. |
| Botones gordos, íconos propios, colores en `tokens.css` | Se siente app de tienda, no página web. |

**Lo que se puede mejorar:**

| Problema | Qué pasa | Qué hicimos en v9 |
|---|---|---|
| **Demasiadas capas de juego** | Aventura, mazmorra, temporadas, álbum de 39 cartas, jefe de la semana, duelos, Cindy y ajedrez, todo en 2 días. Entrenar quedó con 5 pestañas. Duolingo tiene UNA mecánica central y todo lo demás la alimenta. | Entrenar quedó en 3 pestañas: Rutina, Redes y Retos. Aventura queda guardada en el código, apagada, hasta que la decidamos juntos. |
| **La rutina por defecto es la de Kiki** | Un usuario nuevo recibe muscle ups, dominadas a 7, 7 días de entreno y "redes bloqueadas" desde la primera pantalla. Se siente regaño, no bienvenida. | Rutina de inicio de 3 días para principiante, sin candado. La de Kiki sigue en su cuenta. |
| **Se escondió lo que hacía distinto a Bambú** | La Biblia sin señal, la noche ("¿diste lo que traías?") y la comida con cuidado para menores siguen en el código, pero el camino ya no las muestra. | Vuelven al camino como nodos (Biblia y Noche) si tienes ese módulo prendido. |
| **Un segundo backend** | Firebase con reglas en un repo que Gael no puede ver. Dos socios, dos nubes, nadie audita la del otro. | Una sola nube: Supabase, con el historial de Gael, invitaciones, NFC, avisos y 29 pruebas de aislamiento. Lo social se rehace ahí (encargo a Codex en `codex/v9-social`). |
| **Perfiles públicos y buscador abierto** | La mayoría de usuarios tendrá 13 a 17 años. Un directorio donde cualquiera ve a cualquiera es el riesgo número uno con Apple y con los papás. | Amigos solo por código exacto, perfil privado por defecto, sin buscador abierto. |
| Publicar directo, sin rama compartida | Cada uno avanzaba en su copia y se separaron. | El repo `bambu-abierto` es el tronco de los dos (ver `CONTRIBUTING.md`). |

### Como consumidor (abro la app por primera vez)

- **Lo que me engancha:** Brote dormido que despiertas, el camino con un botón verde gigante, sentir que la app es un juego.
- **Lo que me frena:** antes de hacer nada me dice "¡Ya pasó tu hora! Redes bloqueadas". Entro a Entrenar y veo 5 pestañas; no sé cuál tocar. Arriba veo fuego, rayo, una medalla y XP; no sé cuál importa.
- **Lo que me haría pagar:** que la cámara me cuente las lagartijas y eso me compre minutos de TikTok. Eso no lo tiene ninguna app de hábitos.

## 3. Investigación: 10 apps

Los números de ingresos son estimaciones de terceros (Sensor Tower, Appfigures y similares) salvo donde dice que los dio la empresa. Sirven para ver el tamaño, no para citarlos como exactos.

### 5 apps del nicho que ya venden

| App | Cuánto vende (estimado) | Qué hace | El material que tomamos |
|---|---|---|---|
| **Finch** | Cerca de 1 millón de dólares al mes según Sensor Tower (junio 2026); otras fuentes dicen más. Sin inversionistas. | Mascota que crece cuando cumples tus metas de autocuidado. Nunca te regaña. | **Brote crece por lo que TÚ haces, nunca te castiga.** Es la prueba de que una mascota emocional retiene más que un juego de pelea. |
| **Opal** | 10 millones de dólares al año y 1 millón de usuarios diarios, según su CEO. 11 empleados. | Bloquea apps y te enseña cuánto tiempo recuperaste. | **La métrica estrella es "tiempo recuperado".** Y la fricción antes de abrir una app (la pausa de Bambú ya lo hace). |
| **Pushscroll** | Alrededor de 10 mil dólares al mes; 470 mil descargas. Hay varios clones (Sweatscroll, Repscroll, Push Up Time). | 1 lagartija = 1 minuto de redes, con la cámara contando. | **Valida la idea de Ricardo.** Pero que haya clones dice que solo eso se copia fácil: lo que no se copia es tenerlo junto con todo tu día. |
| **Daylio** | Cerca de 100 mil dólares al mes. | Registras tu día en 2 toques, con íconos, sin escribir. Las estadísticas salen solas. | **Registro en 2 toques** (Buenos días y Noche) y gráficas que nadie tuvo que armar. |
| **Habitica** | Poco, comparado con su fama (alrededor de 15 mil dólares según ScreensDesign). | Tus hábitos son un juego de rol con monstruos, equipo y gremios. | **Lo que NO hay que copiar:** un juego de rol pesado encima de los hábitos cansa. Por eso Aventura queda apagada. |

### 5 apps con el diseño más optimizado

| App | Lo que hace mejor que nadie | El material que tomamos |
|---|---|---|
| **Duolingo** | Un camino, un botón, una racha con protector, una liga semanal. Cada pantalla tiene una sola acción principal. | El camino de Hoy (ya lo trajo Ricardo), el protector de racha y la liga cuando haya amigos. |
| **Apple Fitness (anillos)** | Tres anillos responden "¿cómo voy hoy?" de un vistazo. Cerrarlos se vuelve obsesión sana. | **Tres anillos arriba de Hoy: Cuerpo, Mente y Alma.** Esto es lo nuevo de v9. |
| **Strava** | Tu semana se vuelve algo que presumes. Compartes el logro, no tus datos. | "Tu semana" con imagen para compartir (ya lo trajo Ricardo). |
| **Headspace** | Calma. Una sola recomendación para hoy, ilustraciones suaves, nada grita. | El globo de Brote con UNA sugerencia, nunca tres. |
| **Gentler Streak** | Un tracker de ejercicio que cuenta el descanso como parte del plan y no te hace sentir mal por parar. | Descansar también cierra el día. Encaja con la vara de Gael: medir cuánto diste contra lo que traías, no cuánto produjiste. |

## 4. La fórmula de v9 (el toque nuestro)

Como un artesano: cada material de una app distinta, juntos dan algo que no existe.

> **El camino de Duolingo** para saber qué sigue,
> **los anillos de Apple** para saber cómo vas,
> **Brote de Finch** para que se sienta vivo y sin regaño,
> **la cámara de Pushscroll** para medir sin escribir y ganarte tus redes,
> **la pausa de Opal** para que el teléfono no te gane,
> **los 2 toques de Daylio** para la mañana y la noche,
> **la semana de Strava** para presumir,
> y **la vara de Gael** para medir si diste lo que traías.

Ninguna de las 10 junta medir el cuerpo, la mente y el alma en un mismo día. Ese es el hueco.

## 5. Lo que v9 aplica ya

1. Diseño de Kiki completo (oscuro, camino, botones, íconos).
2. **Anillos del día** (Cuerpo, Mente, Alma) en la tarjeta de Hoy.
3. Camino con **Biblia** y **Noche** cuando esos módulos están prendidos.
4. Entrenar en **3 pestañas**: Rutina, Redes, Retos.
5. Cámara que cuenta y minutos de redes, tal cual los hizo Ricardo.
6. **Rutina de inicio para principiante** y sin candado el primer día.
7. Bienvenida con la **edad** (la comida para menores la necesita) y el módulo Biblia.
8. Nube única en Supabase. Amigos y duelos se esconden hasta que su parte en Supabase pase las pruebas.

## 6. Lo que falta para la App Store (sin adornos)

1. **Bloquear apps de verdad necesita app nativa** con el permiso Family Controls de Apple y una cuenta de desarrollador a nombre de un adulto. Una PWA no puede. El camino corto es envolver esta app con Capacitor y escribir solo el módulo de bloqueo en Swift.
2. **Apple rechaza apps que son "solo una web"** (regla 4.2). La cámara, los avisos y el bloqueo nativo son lo que nos salva de eso.
3. **Menores de edad:** política de privacidad clara, nada público por defecto, borrar cuenta desde la app (ya existe) y, para menores de 13, permiso de los papás.
4. Dominio propio y marca en un solo lugar (hoy hay una copia en Vercel y otra en el dominio de Kiki).

## Fuentes

- Finch: [Sensor Tower vía Review Rounds](https://review-rounds.com/finch-business-model-bootstrapped-self-care-pet-app/), [AppSprint](https://appsprint.app/finch-monthly-recurring-revenue)
- Opal: [RevenueCat, Sub Club](https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026), [Speedinvest](https://www.speedinvest.com/knowledge/scaling-smart-how-opal-built-a-10m-arr-business-in-just-2-years)
- Pushscroll: [Adapty](https://adapty.io/paywall-library/pushscroll/), [AppGoblin](https://appgoblin.info/apps/com.pushscroll.pushscrollapp), [App Store](https://apps.apple.com/us/app/pushscroll-exercise-to-scroll/id6741765734)
- Daylio: [Trends.vc](https://trends.vc/opportunities/companies/daylio), [Adapty](https://adapty.io/paywall-library/daylio-journal/)
- Habitica: [ScreensDesign](https://screensdesign.com/apps/habitica-gamified-taskmanager/)
