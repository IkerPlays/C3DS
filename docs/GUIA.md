# Tu primer juego en 10 minutos

Esta guía te lleva de cero a un juego que puedes jugar en el navegador y compilar para tu 3DS. No hace falta saber programar.

## 1. Empieza con una plantilla
Abre el **Editor** y pulsa **Proyectos** → elige una plantilla. Para esta guía usa **Recoger monedas**: ya tiene un jugador, una moneda que gira, un marcador y una regla que suma puntos.

Pulsa **▶ Probar**. Muévete con las flechas. Con **⏸ Pausa**, **⏭ Frame** y **Cajas de colisión** puedes ver qué pasa en cada instante.

## 2. Cambia cosas
- Haz clic en un objeto del escenario o de la lista. A la derecha ves sus propiedades: posición, tamaño, color, velocidad, gravedad…
- Arrástralo para moverlo, o usa las flechas (**Mayús** mueve 10 px). **Mayús + clic** selecciona varios.
- **Ctrl+Z / Ctrl+Y** deshacen y rehacen. Todo se guarda solo en tu navegador.

## 3. Haz que pasen cosas (pestaña Lógica)
Una regla dice *“cuando pase esto → haz esto”*. Por ejemplo:
- **Cuando** el jugador choca con la moneda → **suma 1** a `puntos` y **coloca la moneda al azar**.
- **Cuando** se pulsa **A** *y además* el jugador está sobre el suelo → **cambia su velocidad vertical** (un salto).

Añade una regla con **+ Nueva regla**, elige el evento y las acciones. Verás un resumen en lenguaje natural arriba de cada regla. La referencia completa está en **? → Ver todos los eventos y acciones**.

## 4. Físicas
- **Gravedad** hace caer al objeto; **Sólido** hace que los demás no puedan atravesarlo (suelos, muros, plataformas).
- **Sigue a** hace que un objeto persiga a otro (enemigos). **Opacidad** y **Espejo** cambian cómo se ve.
- Para suelos y muros usa un **sprite con mosaico** (columnas × filas).

## 5. Imágenes, sonido y escenas
- **Imágenes**: sube PNG/JPG/WebP. Con el icono de tijeras cortas una hoja de sprites en fotogramas y creas una animación.
- **Sonidos**: WAV/OGG/MP3, se convierten solos. Marca el icono de repetir para música.
- **Escenas**: menú, niveles, pantalla final. Cambia entre ellas con la acción **Ir a la escena**. En la pestaña **Escena** eliges el fondo, la transición, y el **autor, descripción e icono** que verás en el menú HOME de la 3DS.

## 6. Récords y variables
Crea variables (`puntos`, `vidas`…) y muéstralas en un texto con `{puntos}`. Marca el disquete para **guardarlas en la SD** y usa **Guardar el máximo en una variable** para un récord.

## 7. Llévalo a tu 3DS
**Exportar** → *Proyecto 3DS (.zip)* o *Compilar en la nube (.3dsx + .cia)*. Copia el `.3dsx` a `/3ds/` de la tarjeta SD (Homebrew Launcher) o instala el `.cia` con FBI. También puedes probarlo en el emulador [Azahar](https://azahar-emu.org/).

Otras salidas: **HTML5** (para itch.io), y juegos para **Windows, macOS y Linux**.

> Aviso honesto: el `.cia` compila en el CI pero aún no se ha probado en una consola real.
