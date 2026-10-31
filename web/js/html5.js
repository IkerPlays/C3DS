// Exportación HTML5: un único index.html jugable (usa el mismo motor que la vista previa).
const strip = (src) => src.replace(/^import .*$/gm, '').replace(/^export /gm, '');

export function buildHtml5(project, runtimeSource) {
  const data = JSON.stringify(project).replace(/</g, '\\u003c');
  const title = String(project.name).replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
html,body{margin:0;height:100%;background:#111;color:#ddd;font:14px system-ui,sans-serif}
main{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:100%;padding:8px;box-sizing:border-box}
canvas{background:#000;image-rendering:pixelated;max-width:100%;touch-action:none}
#top{width:min(100%,800px)}#bottom{width:min(100%,640px)}
p{margin:0;opacity:.7;text-align:center}
</style></head><body><main>
<canvas id="top" width="400" height="240"></canvas>
<canvas id="bottom" width="320" height="240"></canvas>
<p>D-Pad: flechas · A: Z · B: X · X: S · Y: A · Start: Enter · Pantalla inferior: ratón/toque<br>Hecho con C3DS</p>
</main>
<script type="application/json" id="project">${data}</script>
<script>
const SCREENS = { top: { w: 400, h: 240 }, bottom: { w: 320, h: 240 } };
${strip(runtimeSource)}
(function () {
  const project = JSON.parse(document.getElementById('project').textContent);
  const images = new Map(); const sounds = new Map();
  const loads = project.assets.images.map((a) => new Promise((res) => { const im = new Image(); im.onload = () => { images.set(a.id, im); res(); }; im.onerror = res; im.src = project.blobs[a.id]; }));
  for (const s of project.assets.sounds) sounds.set(s.id, new Audio(project.blobs[s.id]));
  Promise.all(loads).then(() => runInCanvases(project, { top: document.getElementById('top'), bottom: document.getElementById('bottom') }, images, sounds));
})();
</script></body></html>
`;
}
