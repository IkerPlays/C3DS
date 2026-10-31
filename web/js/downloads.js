// Descargas: lee las releases de GitHub, agrupa los archivos por sistema y recomienda el de tu dispositivo.
export const REPO = 'IkerPlays/C3DS';
export const OS_INFO = {
  windows: { label: 'Windows', icon: 'windows', note: 'Windows 10/11 (64 bits)' },
  macos: { label: 'macOS', icon: 'macos', note: 'Apple Silicon. Sin notarizar: clic derecho → Abrir' },
  linux: { label: 'Linux', icon: 'linux', note: '.deb (Debian/Ubuntu) o AppImage' },
  android: { label: 'Android', icon: 'android', note: 'APK de depuración, instalable directamente' },
  ios: { label: 'iOS', icon: 'ios', note: 'IPA sin firmar: instálalo con AltStore/Sideloadly' },
};
const OS_ORDER = ['windows', 'macos', 'linux', 'android', 'ios'];

const KIND = (os, detail, ext) => {
  if (ext === 'apk') return { label: 'APK', rank: 0 };
  if (ext === 'ipa') return { label: 'IPA sin firmar', rank: 0 };
  if (ext === 'dmg') return { label: 'Imagen .dmg', rank: 0 };
  if (/Setup/i.test(detail)) return { label: 'Instalador', rank: 0 };
  if (/Portable/i.test(detail)) return { label: 'Portable (sin instalar)', rank: 1 };
  if (ext === 'AppImage') return { label: 'AppImage', rank: 0 };
  if (ext === 'deb') return { label: '.deb (Debian/Ubuntu)', rank: 1 };
  return { label: `${os} .${ext}`, rank: 2 };
};

/** C3DS-0.1.0-Windows-Setup.exe -> { version, os, detail, ext } (o null) */
export function parseAssetName(name) {
  const m = /^C3DS-(.+?)-(Windows|macOS|Linux|Android|iOS)(?:-(.+?))?\.(exe|dmg|deb|AppImage|apk|ipa)$/.exec(name);
  if (!m) return null;
  return { version: m[1], os: m[2].toLowerCase() === 'macos' ? 'macos' : m[2].toLowerCase(), detail: m[3] || '', ext: m[4] };
}

export function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1048576).toFixed(bytes < 10 * 1048576 ? 1 : 0)} MB`;
}

/** Normaliza una release de la API de GitHub. */
export function groupRelease(r) {
  const byOs = {};
  let checksums = null;
  for (const a of r.assets || []) {
    if (a.name === 'SHA256SUMS.txt') { checksums = a.browser_download_url; continue; }
    const info = parseAssetName(a.name);
    if (!info) continue;
    const kind = KIND(info.os, info.detail, info.ext);
    (byOs[info.os] ||= []).push({ name: a.name, url: a.browser_download_url, size: a.size, kind: kind.label, rank: kind.rank, ext: info.ext });
  }
  for (const list of Object.values(byOs)) list.sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name));
  return { tag: r.tag_name, version: String(r.tag_name).replace(/^(v|dev-)/, ''), name: r.name, url: r.html_url, date: r.published_at, prerelease: !!r.prerelease, notes: r.body || '', byOs, checksums, oses: OS_ORDER.filter((o) => byOs[o]) };
}

export function detectOS(ua = '', platform = '', maxTouch = 0) {
  const s = `${ua} ${platform}`;
  if (/android/i.test(s)) return 'android';
  if (/iPhone|iPad|iPod/i.test(s) || (/Mac/i.test(platform) && maxTouch > 1)) return 'ios';
  if (/Win/i.test(s)) return 'windows';
  if (/Mac/i.test(s)) return 'macos';
  if (/Linux|X11|CrOS/i.test(s)) return 'linux';
  return null;
}

export const primaryAsset = (group, os) => group?.byOs[os]?.[0] || null;

/** Devuelve { stable, dev } (la release estable más reciente y el devbuild más reciente). */
export async function fetchReleases(fetchImpl = fetch) {
  const res = await fetchImpl(`https://api.github.com/repos/${REPO}/releases?per_page=20`, { headers: { accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
  const all = (await res.json()).filter((r) => !r.draft).map(groupRelease);
  const stable = all.find((r) => !r.prerelease && r.oses.length) || null;
  const dev = all.find((r) => r.prerelease && /^dev-/.test(r.tag) && r.oses.length) || null;
  return { stable, dev, all };
}

/** Markdown mínimo y seguro (títulos ###, listas, **negrita**, `código`) -> nodos DOM. */
export function renderNotes(md, h) {
  const inline = (text) => {
    const out = [];
    for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
      if (!part) continue;
      if (part.startsWith('**')) out.push(h('strong', {}, part.slice(2, -2)));
      else if (part.startsWith('`')) out.push(h('code', {}, part.slice(1, -1)));
      else out.push(part);
    }
    return out;
  };
  const nodes = []; let list = null;
  for (const line of String(md).split(/\r?\n/)) {
    if (/^\s*[-*] /.test(line)) { if (!list) { list = h('ul', {}); nodes.push(list); } list.append(h('li', {}, inline(line.replace(/^\s*[-*] /, '')))); continue; }
    list = null;
    if (/^#{1,6} /.test(line)) nodes.push(h('h4', {}, inline(line.replace(/^#+ /, ''))));
    else if (line.trim()) nodes.push(h('p', {}, inline(line)));
  }
  return nodes;
}
