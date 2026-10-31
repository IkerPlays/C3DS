// Motor de simulación: reproduce en JavaScript el comportamiento del código C generado para la 3DS.
// Se usa en la vista previa del editor y en la exportación HTML5. Sin dependencias de DOM en `Game`.
import { SCREENS } from './model.js';

export const formatText = (tpl, vars) => String(tpl).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, n) => (n in vars ? String(vars[n]) : m));

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const num = (v) => Number(v) || 0;

export class Game {
  /** @param {object} project @param {{rng?:()=>number, onSound?:(id:number)=>void}} opts */
  constructor(project, opts = {}) {
    this.p = project;
    this.rng = opts.rng || Math.random;
    this.onSound = opts.onSound || (() => {});
    this.vars = Object.fromEntries(project.variables.map((v) => [v.name, num(v.value)]));
    this.sceneId = project.startScene;
    this.quit = false;
    this.frames = 0;
    this.enter(this.sceneId);
  }

  get scene() { return this.p.scenes.find((s) => s.id === this.sceneId); }

  enter(id) {
    this.sceneId = id;
    this.frames = 0;
    this.objs = this.scene.objects.map((o) => ({ ...o, tpl: o.text }));
  }

  obj(id) { return this.objs.find((o) => o.id === id); }

  /** input: { down:Set<string>, held:Set<string>, touch:{x,y}|null, touchDown:boolean } */
  step(input) {
    if (this.quit) return;
    const { down = new Set(), held = new Set(), touch = null, touchDown = false } = input;
    const touched = touchDown && touch;
    for (const o of this.objs) {
      if (!o.visible) continue;
      const s = SCREENS[o.screen];
      let mx = 0; let my = 0;
      if (o.controls) {
        if (o.controls !== 'v') mx = ((held.has('RIGHT') ? 1 : 0) - (held.has('LEFT') ? 1 : 0)) * o.speed;
        if (o.controls !== 'h') my = ((held.has('DOWN') ? 1 : 0) - (held.has('UP') ? 1 : 0)) * o.speed;
      }
      mx += num(o.vx); my += num(o.vy);
      if (!mx && !my) continue;
      o.x = Math.max(0, Math.min(s.w - o.w, o.x + mx));
      o.y = Math.max(0, Math.min(s.h - o.h, o.y + my));
    }
    let next = null;
    for (const r of this.scene.rules) {
      if (r.enabled === false) continue;
      if (!this.test(r.when, down, held, touched, touch)) continue;
      for (const a of r.then) {
        const n = this.act(a);
        if (n != null) next = n;
      }
    }
    this.frames++;
    if (next != null) this.enter(next);
  }

  test(w, down, held, touched, touch) {
    switch (w.type) {
      case 'start': return this.frames === 0;
      case 'key': return down.has(w.key);
      case 'keyHeld': return held.has(w.key);
      case 'collide': { const a = this.obj(w.a); const b = this.obj(w.b); return !!a && !!b && a.visible && b.visible && a.screen === b.screen && overlap(a, b); }
      case 'touch': { const o = this.obj(w.obj); return !!touched && !!o && o.visible && o.screen === 'bottom' && touch.x >= o.x && touch.x < o.x + o.w && touch.y >= o.y && touch.y < o.y + o.h; }
      case 'var': {
        const v = this.vars[w.var]; const k = num(w.value);
        return { '==': v === k, '!=': v !== k, '>': v > k, '>=': v >= k, '<': v < k, '<=': v <= k }[w.op] ?? false;
      }
      case 'edge': {
        const o = this.obj(w.obj); if (!o || !o.visible) return false;
        const sc = SCREENS[o.screen];
        return { left: o.x <= 0, right: o.x + o.w >= sc.w, top: o.y <= 0, bottom: o.y + o.h >= sc.h }[w.edge] ?? false;
      }
      case 'timer': { const f = Math.max(1, Math.round(num(w.seconds) * 60)); return this.frames > 0 && this.frames % f === 0; }
      default: return false;
    }
  }

  /** Ejecuta una acción; devuelve el id de escena si hay que cambiar de escena. */
  act(a) {
    const o = a.obj != null ? this.obj(a.obj) : null;
    switch (a.type) {
      case 'goto': return a.scene;
      case 'setVar': this.vars[a.var] = num(a.value); break;
      case 'addVar': this.vars[a.var] = (this.vars[a.var] || 0) + num(a.value); break;
      case 'sound': this.onSound(a.sound); break;
      case 'setPos': if (o) { o.x = num(a.x); o.y = num(a.y); } break;
      case 'move': if (o) { o.x += num(a.dx); o.y += num(a.dy); } break;
      case 'randomPos': if (o) {
        const s = SCREENS[o.screen]; const ax = a.axis || 'xy';
        if (ax !== 'y') o.x = Math.floor(this.rng() * Math.max(1, s.w - o.w));
        if (ax !== 'x') o.y = Math.floor(this.rng() * Math.max(1, s.h - o.h));
      } break;
      case 'setVel': if (o) { if (a.axis === 'y') o.vy = num(a.value); else o.vx = num(a.value); } break;
      case 'setText': if (o) o.tpl = a.text; break;
      case 'show': if (o) o.visible = true; break;
      case 'hide': if (o) o.visible = false; break;
      case 'quit': this.quit = true; break;
      default: break;
    }
    return null;
  }

  text(o) { return formatText(o.tpl, this.vars); }
}

/** Dibuja la escena actual. `images`: Map(assetId -> CanvasImageSource). */
export function render(game, ctxs, images) {
  const sc = game.scene;
  for (const key of ['top', 'bottom']) {
    const ctx = ctxs[key];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = sc.bg[key]; ctx.fillRect(0, 0, SCREENS[key].w, SCREENS[key].h);
    ctx.textBaseline = 'top'; ctx.font = '14px "DejaVu Sans Mono", monospace';
    for (const o of game.objs) {
      if (!o.visible || o.screen !== key) continue;
      ctx.fillStyle = o.color;
      if (o.type === 'rect') ctx.fillRect(o.x, o.y, o.w, o.h);
      else if (o.type === 'sprite') { const im = images.get(o.image); if (im) ctx.drawImage(im, o.x, o.y, o.w, o.h); else ctx.fillRect(o.x, o.y, o.w, o.h); }
      else if (o.type === 'text') ctx.fillText(game.text(o), o.x, o.y);
      else if (o.type === 'button') { ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#000'; ctx.fillText(game.text(o), o.x + 6, o.y + o.h / 2 - 8); }
    }
  }
}

export const KEY_MAP = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', z: 'A', x: 'B', s: 'X', a: 'Y', q: 'L', w: 'R', Enter: 'START', Shift: 'SELECT' };

/** Ejecuta el juego en 2 canvas a 60 pasos/s. Devuelve el control del simulador (pausa, paso, reinicio, velocidad…). */
export function runInCanvases(project, canvases, images, sounds, opts = {}) {
  const ctxs = { top: canvases.top.getContext('2d'), bottom: canvases.bottom.getContext('2d') };
  const mkGame = () => new Game(project, { onSound: (id) => { try { const a = sounds.get(id); if (a) { a.currentTime = 0; a.play().catch(() => {}); } } catch { /* sin audio */ } } });
  let game = mkGame();
  const held = new Set(); let down = new Set(); let touch = null; let touchDown = false; let lastTouch = null;
  let paused = false; let speed = 1; let stepOnce = false; let boxes = false;
  const kd = (e) => { if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName)) return; const k = KEY_MAP[e.key] || KEY_MAP[e.key?.toLowerCase()]; if (!k) return; e.preventDefault(); if (!held.has(k)) down.add(k); held.add(k); };
  const ku = (e) => { const k = KEY_MAP[e.key] || KEY_MAP[e.key?.toLowerCase()]; if (k) held.delete(k); };
  const bc = canvases.bottom;
  const pos = (e) => { const r = bc.getBoundingClientRect(); return { x: ((e.clientX - r.left) * SCREENS.bottom.w) / r.width, y: ((e.clientY - r.top) * SCREENS.bottom.h) / r.height }; };
  const pd = (e) => { touch = pos(e); lastTouch = touch; touchDown = true; bc.setPointerCapture?.(e.pointerId); };
  const pm = (e) => { if (touch) touch = pos(e); };
  const pu = () => { touch = null; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  bc.addEventListener('pointerdown', pd); bc.addEventListener('pointermove', pm); bc.addEventListener('pointerup', pu); bc.addEventListener('pointercancel', pu);
  let raf = 0; let last = performance.now(); let acc = 0; let alive = true;
  const tick = () => { game.step({ down, held, touch: touch || (touchDown ? lastTouch : null), touchDown }); down = new Set(); touchDown = false; };
  const drawBoxes = () => {
    for (const key of ['top', 'bottom']) {
      const ctx = ctxs[key]; ctx.strokeStyle = '#00e436'; ctx.lineWidth = 1;
      for (const o of game.objs) if (o.visible && o.screen === key && o.type !== 'text') ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }
  };
  const loop = (now) => {
    if (!alive) return;
    acc += Math.min(100, now - last) * speed; last = now;
    while (acc >= 1000 / 60) {
      acc -= 1000 / 60;
      if (!paused || stepOnce) { tick(); stepOnce = false; }
      else acc = 0;
    }
    render(game, ctxs, images);
    if (boxes) drawBoxes();
    opts.onFrame?.(game);
    if (game.quit) { alive = false; opts.onQuit?.(); return; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return {
    get game() { return game; },
    get paused() { return paused; },
    press: (k) => { down.add(k); held.add(k); setTimeout(() => held.delete(k), 120); },
    hold: (k, on) => { if (on) { if (!held.has(k)) down.add(k); held.add(k); } else held.delete(k); },
    pause: (v = true) => { paused = v; },
    step: () => { paused = true; stepOnce = true; },
    restart: () => { game = mkGame(); },
    setSpeed: (v) => { speed = Math.max(0.1, Math.min(4, Number(v) || 1)); },
    showBoxes: (v) => { boxes = !!v; },
    stop() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      bc.removeEventListener('pointerdown', pd); bc.removeEventListener('pointermove', pm); bc.removeEventListener('pointerup', pu); bc.removeEventListener('pointercancel', pu);
    },
  };
}
