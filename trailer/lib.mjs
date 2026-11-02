// "Cámara" del tráiler: graba la app real con Playwright, con cursor visible, subtítulos y anillos de resalte.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

export const W = 1920;
export const H = 1080;
export const ZOOM = 1.25; // la interfaz se ve más grande (mejor para móviles y pantallas pequeñas)

const WEB = new URL('../web/', import.meta.url).pathname;
const TRAILER = new URL('./', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json' };

/** Servidor estático: la web en "/" y los recursos del tráiler en "/trailer/". */
export async function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const isTrailer = url.startsWith('/trailer/');
    const base = isTrailer ? TRAILER : WEB;
    const rel = isTrailer ? url.slice('/trailer/'.length) : url === '/' ? 'index.html' : url;
    const file = normalize(join(base, rel));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
    try { const d = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/plain' }); res.end(d); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, r));
  return { url: `http://localhost:${server.address().port}`, close: () => server.close() };
}

export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/* ---------- Capa de "dirección" inyectada en cada página ---------- */
const DRESS = `(() => {
  const Z = ${ZOOM};
  const css = \`
    html.t-zoom{zoom:\${Z}}
    #t-layer{position:fixed;inset:0;z-index:2147483000;pointer-events:none;zoom:\${1 / Z};overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    #t-cur{position:absolute;left:0;top:0;width:38px;height:38px;transform:translate(-200px,-200px);filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
    .t-rip{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:4px solid #ff4d7d;opacity:.9;animation:t-rip .55s ease-out forwards}
    @keyframes t-rip{to{transform:scale(4.2);opacity:0}}
    #t-cap{position:absolute;left:50%;bottom:46px;transform:translate(-50%,28px);opacity:0;transition:opacity .35s ease,transform .45s cubic-bezier(.2,.9,.2,1);text-align:center;max-width:1500px}
    #t-cap.on{opacity:1;transform:translate(-50%,0)}
    #t-cap .k{display:inline-block;font-weight:800;font-size:21px;line-height:1;letter-spacing:.22em;text-transform:uppercase;color:#fff;background:linear-gradient(90deg,#ff004d,#ff7a18);padding:8px 16px;border-radius:99px;margin-bottom:14px;box-shadow:0 8px 24px rgba(255,0,77,.4)}
    #t-cap .t{display:block;font-weight:800;font-size:46px;line-height:1.12;color:#fff;background:rgba(12,14,28,.82);backdrop-filter:blur(14px);padding:16px 36px;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.12);text-shadow:0 2px 10px rgba(0,0,0,.4)}
    .t-ring{position:absolute;border-radius:16px;border:5px solid #ffd400;box-shadow:0 0 0 9999px rgba(8,10,24,.35),0 0 40px #ffd400;opacity:0;transition:opacity .3s ease;animation:t-pulse 1.1s ease-in-out infinite}
    .t-ring.on{opacity:1}
    @keyframes t-pulse{50%{box-shadow:0 0 0 9999px rgba(8,10,24,.35),0 0 70px #ffd400}}
    .t-ring.soft{box-shadow:0 0 26px #ffd400;animation:t-pulse-soft 1.1s ease-in-out infinite}
    @keyframes t-pulse-soft{50%{box-shadow:0 0 52px #ffd400}}
  \`;
  const mount = () => {
    if (document.getElementById('t-layer')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    document.documentElement.classList.add('t-zoom');
    const layer = document.createElement('div'); layer.id = 't-layer';
    layer.innerHTML = '<svg id="t-cur" viewBox="0 0 24 24"><path d="M3 2l7.4 19 2.6-7.6L20.6 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><div id="t-cap"></div>';
    document.documentElement.append(layer);
    const cur = layer.querySelector('#t-cur');
    const move = (e) => { cur.style.transform = 'translate(' + (e.clientX - 6) + 'px,' + (e.clientY - 3) + 'px)'; };
    addEventListener('mousemove', move, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div'); r.className = 't-rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      layer.append(r); setTimeout(() => r.remove(), 700);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.__cap = (kicker, text) => {
    const c = document.getElementById('t-cap'); if (!c) return;
    if (!text) { c.classList.remove('on'); return; }
    c.innerHTML = (kicker ? '<span class="k"></span><br>' : '') + '<span class="t"></span>';
    if (kicker) c.querySelector('.k').textContent = kicker;
    c.querySelector('.t').textContent = text;
    requestAnimationFrame(() => c.classList.add('on'));
  };
  window.__ring = (x, y, w, h, soft) => {
    const layer = document.getElementById('t-layer'); if (!layer) return;
    layer.querySelectorAll('.t-ring').forEach((r) => r.remove());
    if (x == null) return;
    const r = document.createElement('div'); r.className = 't-ring' + (soft ? ' soft' : '');
    const pad = 10;
    r.style.cssText = 'left:' + (x - pad) + 'px;top:' + (y - pad) + 'px;width:' + (w + pad * 2) + 'px;height:' + (h + pad * 2) + 'px';
    layer.append(r); requestAnimationFrame(() => r.classList.add('on'));
  };
})();`;

/** Releases de ejemplo (la red no es necesaria): coinciden con los assets reales de v0.4.0. */
const names = (v) => ['Android.apk', 'iOS-unsigned.ipa', 'Linux-amd64.deb', 'Linux-x86_64.AppImage', 'macOS-arm64.dmg', 'Windows-Portable.exe', 'Windows-Setup.exe'].map((n) => `C3DS-${v}-${n}`).concat('SHA256SUMS.txt');
const mk = (tag, pre, v, body, date) => ({ tag_name: tag, name: pre ? `Devbuild ${v}` : `C3DS ${tag}`, html_url: `https://github.com/IkerPlays/C3DS/releases/tag/${tag}`, published_at: date, prerelease: pre, draft: false, body,
  assets: names(v).map((n) => ({ name: n, size: n.endsWith('AppImage') ? 80_700_000 : n.endsWith('.apk') ? 3_870_000 : n.includes('Portable') ? 6_020_000 : 1_800_000, browser_download_url: `https://github.com/IkerPlays/C3DS/releases/download/${tag}/${n}` })) });
export const RELEASES = [
  mk('v0.4.0', false, '0.4.0', '- Objetos **sólidos** (muros, suelos, plataformas) en simulador y en C; plantilla **Laberinto**.\n- Acciones nuevas: **número al azar** y **cambiar animación**; evento **se suelta un botón**.\n- Plantilla **Topos** (táctil, temporizador y cuenta atrás).', '2026-10-31T21:30:09Z'),
  mk('v0.3.0', false, '0.3.0', '- **Compartir con un enlace**, **mando** en la vista previa, arrastrar y soltar.\n- Iconos SVG propios.', '2026-10-31T18:04:25Z'),
  mk('v0.2.0', false, '0.2.0', '- Exportar a **macOS** y **Linux**; simulación avanzada; Circle Pad y stylus.', '2026-10-31T11:14:59Z'),
];

/** Abre una escena: contexto con vídeo, red simulada y capa de dirección. */
export async function openScene(browser, server, { dir, path = '/#editor', ready = null, dress = true, scheme = 'dark' }) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, recordVideo: { dir, size: { width: W, height: H } }, serviceWorkers: 'block', acceptDownloads: true, locale: 'es-ES',
    colorScheme: scheme,
  });
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('/releases?') ? RELEASES : { tag_name: 'v0.4.0', html_url: 'https://github.com/IkerPlays/C3DS/releases' }) }));
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => (r.request().url().startsWith('https://api.github.com') ? r.fallback() : r.abort()));
  if (dress) await ctx.addInitScript(DRESS);
  // La grabación empieza al crear la página: se mide el desfase hasta que la escena está lista.
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('c3ds:guide', '1'); } catch { /* ok */ } });
  await page.goto(server.url + path);
  if (ready) await page.waitForSelector(ready);
  await page.waitForTimeout(250);
  const offset = (Date.now() - t0) / 1000;
  return { ctx, page, offset, started: Date.now() };
}

/* ---------- Gestos ---------- */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

export function actor(page, speed = 1) {
  let pos = { x: W / 2, y: H / 2 };
  const api = {
    wait: (ms) => page.waitForTimeout(ms / speed),
    /** Mueve el cursor suavemente (px reales de la ventana de 1920x1080). */
    async glide(x, y, ms = 700) {
      ms /= speed; const a = pos; const t0 = Date.now();
      for (;;) {
        const k = Math.min(1, (Date.now() - t0) / ms); const e = ease(k);
        await page.mouse.move(a.x + (x - a.x) * e, a.y + (y - a.y) * e);
        if (k >= 1) break;
      }
      pos = { x, y };
    },
    async center(sel, i = 0) {
      const el = page.locator(sel).nth(i); await el.scrollIntoViewIfNeeded().catch(() => {});
      const b = await el.boundingBox(); if (!b) throw new Error('sin caja: ' + sel);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
    },
    async hover(sel, ms = 600, i = 0) { const c = await api.center(sel, i); await api.glide(c.x, c.y, ms); return c; },
    async click(sel, { ms = 700, i = 0, hold = 120 } = {}) {
      const c = await api.center(sel, i); await api.glide(c.x, c.y, ms);
      await page.mouse.down(); await page.waitForTimeout(hold / speed); await page.mouse.up(); await page.waitForTimeout(120 / speed);
    },
    async clickAt(x, y, ms = 600) { await api.glide(x, y, ms); await page.mouse.down(); await page.waitForTimeout(110 / speed); await page.mouse.up(); await page.waitForTimeout(100 / speed); },
    async drag(from, to, ms = 800) {
      await api.glide(from.x, from.y, 500); await page.mouse.down(); await page.waitForTimeout(120);
      await api.glide(to.x, to.y, ms); await page.mouse.up(); await page.waitForTimeout(160);
    },
    async type(sel, text, { delay = 70, ms = 600 } = {}) { await api.click(sel, { ms }); await page.keyboard.press('Control+A'); await page.keyboard.type(String(text), { delay }); },
    cap: (kicker, text) => page.evaluate(([k, t]) => window.__cap?.(k, t), [kicker, text]),
    capOff: () => page.evaluate(() => window.__cap?.()),
    async ring(sel, { i = 0, soft = false } = {}) { const c = await api.center(sel, i); await page.evaluate(([x, y, w, h, s]) => window.__ring?.(x, y, w, h, s), [c.b.x, c.b.y, c.b.width, c.b.height, soft]); },
    ringOff: () => page.evaluate(() => window.__ring?.()),
    async smoothScroll(to, ms = 1500) {
      await page.evaluate(([y, d]) => new Promise((res) => { const y0 = scrollY; const t0 = performance.now(); const e = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2); const f = (n) => { const k = Math.min(1, (n - t0) / d); scrollTo(0, y0 + (y - y0) * e(k)); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), [to, ms]);
    },
  };
  return api;
}
