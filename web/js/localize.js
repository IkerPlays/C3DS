// Traduce al inglés los proyectos de ejemplo (plantillas, lecciones y proyecto inicial) cuando la interfaz está en inglés.
// Renombra de forma coherente variables, objetos, escenas, recursos y textos (con sus {variables}).
import { getLang } from './i18n.js';

const VARS = { puntos: 'score', mejor: 'best', total: 'total', record: 'record', tiempo: 'time', pasos: 'steps', monedas: 'coins', clics: 'clicks' };
const PROJECTS = {
  'Mi primer juego': 'My first game', 'Esquivar': 'Dodge', 'Corredor': 'Runner', 'Topos': 'Whack-a-mole', 'Laberinto': 'Maze', 'Proyecto nuevo': 'New project',
  'Mundo ancho': 'Wide world', 'Persecución': 'Chase', 'Plataformas': 'Platformer', 'Lección 9 - Cámara': 'Lesson 9 - Camera', 'Lección 8 - Pantalla de inicio': 'Lesson 8 - Title screen', 'Lección 6 - Física': 'Lesson 6 - Physics', 'Lección 7 - Perseguir': 'Lesson 7 - Chase', 'Lección 1 - Mover': 'Lesson 1 - Move', 'Lección 2 - Colisiones': 'Lesson 2 - Collisions', 'Lección 3 - Variables': 'Lesson 3 - Variables', 'Lección 4 - Escenas': 'Lesson 4 - Scenes', 'Lección 5 - Sonido': 'Lesson 5 - Sound',
};
const SCENES = { 'Menú': 'Menu', 'Juego': 'Game', 'Partida': 'Match', 'Fin': 'End', 'Corre': 'Run', 'Laberinto': 'Maze', 'Meta': 'Goal', 'Escena 1': 'Scene 1', 'Lección': 'Lesson', 'Inicio': 'Start', 'Segunda': 'Second' };
const NAMES = {
  'Título': 'Title', 'Botón jugar': 'Play button', 'Jugador': 'Player', 'Moneda': 'Coin', 'Marcador': 'Scoreboard', 'Ayuda': 'Help', 'Pala': 'Paddle', 'Pelota': 'Ball', 'Mejor': 'Best',
  'Colina 1': 'Hill 1', 'Colina 2': 'Hill 2', 'Colina 3': 'Hill 3', 'Bloque 3': 'Block 3', 'Bloque 4': 'Block 4', 'Bandera': 'Flag', 'Plataforma 1': 'Platform 1', 'Plataforma 2': 'Platform 2', 'Plataforma 3': 'Platform 3', 'Moneda 1': 'Coin 1', 'Moneda 2': 'Coin 2', 'Moneda 3': 'Coin 3', 'Colina': 'Hill', 'Pulsa': 'Press', 'Escalón': 'Step', 'Perseguidor': 'Chaser', 'Enemigo': 'Enemy', 'Bloque 1': 'Block 1', 'Bloque 2': 'Block 2', 'Fin': 'End', 'Reintentar': 'Retry', 'Nave': 'Ship', 'Puntos': 'Score', 'Suelo': 'Ground', 'Obstáculo': 'Obstacle', 'Topo': 'Mole',
  'Muro 1': 'Wall 1', 'Muro 2': 'Wall 2', 'Muro 3': 'Wall 3', 'Muro 4': 'Wall 4', 'Meta': 'Goal', 'Texto': 'Text', 'Otra vez': 'Again', 'Instrucciones': 'Instructions', 'Botón +1': 'Button +1',
  'Contador': 'Counter', 'Mensaje': 'Message', 'Ir a la segunda': 'Go to second', 'Volver': 'Back', 'Pitido': 'Beep', 'Música': 'Music', 'Parar': 'Stop',
};
const ASSETS = { ladrillo: 'brick', moneda_1: 'coin_1', moneda_2: 'coin_2', moneda_3: 'coin_3', moneda_4: 'coin_4', moneda: 'coin', rebote: 'bounce', punto: 'point', musica: 'music', salto: 'jump', golpe: 'hit', pitido: 'beep' };
const TEXTS = {
  '← → mueven, A salta. “Gravedad” empuja hacia abajo y “Sólido” frena el paso.': '← → move, A jumps. “Gravity” pulls down and “Solid” stops the way.', 'El rojo tiene “Sigue a” = Jugador. Cambia su velocidad en el panel.': 'The red one has “Follows” = Player. Change its speed in the panel.', '← → mueven. Llega a la bandera': '← → move. Reach the flag', 'Escena → “Ancho del mundo” 800 y “La cámara sigue a” Jugador. El texto es “Fijo” y la colina tiene “Paralaje” 0,5.': 'Scene → “World width” 800 and “Camera follows” Player. The text is “Fixed” and the hill has “Parallax” 0.5.', 'MI JUEGO': 'MY GAME', 'Pulsa cualquier botón': 'Press any button', '¡Aquí empieza el juego!\\nVuelve solo en 3 segundos': 'The game starts here!\\nBack on its own in 3 seconds', 'Monedas: {puntos}': 'Coins: {score}', '← → mover   A saltar   Llega a la bandera': '← → move   A jump   Reach the flag', '¡Llegaste! Monedas: {puntos}': 'You made it! Coins: {score}', 'Monedas: {puntos} / 3': 'Coins: {score} / 3', '← → mover   A saltar': '← → move   A jump', 'No dejes que el rojo te alcance': 'Don’t let the red one catch you', '¡Te alcanzaron!  {puntos} puntos': 'You got caught!  {score} points', 'MI PRIMER JUEGO': 'MY FIRST GAME', 'Jugar': 'Play', 'Puntos: {puntos}': 'Score: {score}', 'D-Pad: mover   START: menú': 'D-Pad: move   START: menu', '{puntos}': '{score}',
  'Mejor racha: {mejor}': 'Best streak: {best}', 'Arriba/Abajo mueven la pala': 'Up/Down move the paddle', 'FIN  -  {puntos} puntos': 'END  -  {score} points', 'Reintentar': 'Retry',
  'Puntos: {puntos}   Total guardado: {total}': 'Score: {score}   Saved total: {total}', 'Circle Pad: nave · Stylus: cursor': 'Circle Pad: ship · Stylus: cursor',
  'Puntos: {puntos}   Récord: {record}': 'Score: {score}   Record: {record}', 'Pulsa A para saltar': 'Press A to jump', '¡Tropezaste!  {puntos} puntos': 'You tripped!  {score} points',
  'Puntos: {puntos}   Tiempo: {tiempo}': 'Score: {score}   Time: {time}', 'Toca al topo en la pantalla de abajo': 'Tap the mole on the bottom screen', '¡Tiempo! Has cazado {puntos}': 'Time’s up! You whacked {score}',
  'Otra vez': 'Again', 'Llega al cuadrado verde': 'Reach the green square', '¡Lo conseguiste!': 'You made it!', 'Prueba ▶ y usa el D-Pad.': 'Try ▶ and use the D-Pad.',
  'Selecciona el rectángulo: cambia “Control” a Circle Pad o solo horizontal.': 'Select the rectangle: change “Control” to Circle Pad or horizontal-only.', 'Monedas: {monedas}': 'Coins: {coins}',
  'Regla: cuando el jugador choca con la moneda → suma 1 y la mueve.': 'Rule: when the player hits the coin → add 1 and move it.', '¡Pulsa!': 'Press!', 'Clics: {clics}': 'Clicks: {clicks}',
  'Toca el botón de abajo (pantalla táctil). Con 5 clics cambia el mensaje.': 'Tap the button below (touch screen). After 5 clicks the message changes.', '¡Ya llevas {clics}!': 'You already have {clicks}!',
  'Escena: Inicio': 'Scene: Start', 'Ir a “Segunda”': 'Go to “Second”', 'Escena: Segunda': 'Scene: Second', 'Volver': 'Back', 'Pitido': 'Beep', 'Música ♪': 'Music ♪', 'Parar música': 'Stop music',
  'Las canciones usan “bucle” (el icono de repetir en la lista de sonidos).': 'Songs use “loop” (the repeat icon in the sound list).',
};

const renameVarsIn = (s) => (typeof s === 'string' ? s.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, v) => (VARS[v] ? `{${VARS[v]}}` : m)) : s);

/** Devuelve el mismo proyecto con todo en inglés (modifica el objeto recibido). */
export function localizeProject(p) {
  p.name = PROJECTS[p.name] ?? p.name;
  for (const v of p.variables) v.name = VARS[v.name] ?? v.name;
  for (const a of p.assets.images) { a.name = ASSETS[a.name] ?? a.name; if (a.group) a.group = ASSETS[a.group] ?? a.group; }
  for (const a of p.assets.sounds) a.name = ASSETS[a.name] ?? a.name;
  for (const s of p.scenes) {
    s.name = SCENES[s.name] ?? s.name;
    for (const o of s.objects) {
      o.name = NAMES[o.name] ?? o.name;
      if (o.animGroup) o.animGroup = ASSETS[o.animGroup] ?? o.animGroup;
      if (o.type === 'text' || o.type === 'button') o.text = TEXTS[o.text] ?? renameVarsIn(o.text);
    }
    for (const r of s.rules) {
      for (const e of [r.when, r.also]) if (e && e.var) e.var = VARS[e.var] ?? e.var;
      for (const a of r.then) {
        if (a.var) a.var = VARS[a.var] ?? a.var;
        if (a.type === 'setText') a.text = TEXTS[a.text] ?? renameVarsIn(a.text);
        if (a.type === 'setAnim' && a.group) a.group = ASSETS[a.group] ?? a.group;
      }
    }
  }
  return p;
}

/** Aplica la traducción solo si la interfaz está en inglés. */
export const maybeLocalize = (p) => (getLang() === 'en' ? localizeProject(p) : p);
