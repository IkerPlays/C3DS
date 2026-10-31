# Referencia del editor

> Generado automáticamente por `scripts/gen-reference.mjs`. No editar a mano (`npm run gen:docs`).

## Objetos
- **Rectángulo** (`rect`)
- **Texto** (`text`)
- **Sprite** (`sprite`)
- **Botón táctil** (`button`)

## Control de objetos
- `false`: Ninguno
- `true`: D-Pad (4 direcciones)
- `h`: Solo horizontal
- `v`: Solo vertical
- `circle`: Circle Pad (analógico)
- `touch`: Seguir el stylus (táctil)

Otras propiedades de un objeto: posición, tamaño, color, pantalla (superior 400×240 o inferior 320×240 táctil), velocidad automática (Vel X / Vel Y), gravedad, animación por grupo de imágenes, tamaño del texto y visibilidad inicial.

## Eventos (“Cuando…”)
| Id | Descripción | Campos |
|---|---|---|
| `start` | La escena empieza | — |
| `key` | Se pulsa un botón | Botón (botón) |
| `keyHeld` | Se mantiene un botón | Botón (botón) |
| `collide` | Dos objetos chocan | Objeto (objeto), con (objeto) |
| `touchAny` | Se toca la pantalla táctil (en cualquier sitio) | — |
| `touch` | Se toca un objeto (pantalla inferior) | Objeto (objeto) |
| `var` | Una variable cumple una condición | Variable (variable), op (comparación), Valor (número) |
| `edge` | Un objeto toca el borde de la pantalla | Objeto (objeto), Borde (borde) |
| `standing` | Un objeto está apoyado sobre otro | Objeto (objeto), sobre (objeto) |
| `timer` | Cada cierto tiempo | Segundos (número) |

Cualquier regla puede llevar una segunda condición (“Y además…”) y se puede desactivar o reordenar. Bordes: Izquierdo, Derecho, Superior, Inferior. Ejes: Horizontal (X), Vertical (Y).

## Acciones (“Entonces…”)
| Id | Descripción | Campos |
|---|---|---|
| `goto` | Ir a la escena | Escena (escena) |
| `setVar` | Poner variable a | Variable (variable), Valor (número) |
| `addVar` | Sumar a variable | Variable (variable), Cantidad (número) |
| `randVar` | Poner variable a un número al azar | Variable (variable), Mínimo (número), Máximo (número) |
| `sound` | Reproducir sonido | Sonido (sonido) |
| `stopSound` | Parar sonido / música | Sonido (sonido) |
| `setPos` | Colocar objeto en | Objeto (objeto), X (número), Y (número) |
| `move` | Mover objeto | Objeto (objeto), ΔX (número), ΔY (número) |
| `randomPos` | Colocar objeto al azar | Objeto (objeto), En (eje (X, Y o ambos)) |
| `landOn` | Apoyar objeto sobre otro (aterrizar) | Objeto (objeto), sobre (objeto) |
| `setVel` | Cambiar velocidad (px/frame) | Objeto (objeto), Eje (eje), Valor (número) |
| `setText` | Cambiar texto (usa {variable}) | Objeto (objeto), Texto (texto) |
| `setColor` | Cambiar el color de un objeto | Objeto (objeto), Color (color) |
| `setAnim` | Cambiar animación de un sprite | Sprite (objeto), Grupo (grupo de animación) |
| `show` | Mostrar objeto | Objeto (objeto) |
| `hide` | Ocultar objeto | Objeto (objeto) |
| `quit` | Salir del juego | — |

## Botones
A, B, X, Y, L, R, START, SELECT, UP, DOWN, LEFT, RIGHT. En la vista previa: flechas = D-Pad, Z X S A = A B X Y, Q W = L R, Enter = Start, Mayús = Select, I J K L = Circle Pad, ratón = pantalla táctil; un mando conectado también funciona (A = botón derecho, B = abajo, X = arriba, Y = izquierda; stick izquierdo = Circle Pad).

## Texto con variables
En textos y botones, `{nombre}` se sustituye por el valor de la variable. Las variables marcadas con 💾 se guardan en la SD (`sdmc:/3ds/<juego>/save.dat`) y se cargan al arrancar.

## Límites del editor
- Escenas: 16 · Objetos por escena: 64 · Reglas por escena: 64
- Imágenes: 32 (máx. 512 px por lado) · Sonidos: 16 · Variables: 32

## Plantillas
- **Recoger monedas**: Menú con botón táctil, jugador con D-Pad, sprite y sonido.
- **Pong (1 jugador)**: Pelota con velocidad y rebotes en los bordes; pala vertical.
- **Esquivar**: Bloques que caen, marcador y pantalla de fin con reintento.
- **Arcade (Circle Pad + stylus)**: Nave con Circle Pad, cursor táctil, música en bucle, moneda animada y total guardado en la SD.
- **Corredor (saltos)**: Gravedad, saltar con A solo desde el suelo, obstáculos y récord guardado.
- **Topos (táctil)**: Toca al topo antes de que salte; temporizador, cuenta atrás y pantalla final.
- **Laberinto (muros sólidos)**: Objetos sólidos que bloquean el paso: llega a la meta sin atravesar los muros.
- **En blanco**: Una escena vacía.
