// Comprueba si hay una release estable más nueva en GitHub y avisa (las apps nativas llevan la web empaquetada).
export const REPO = 'IkerPlays/C3DS';

export function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('-')[0].split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
}

export async function checkForUpdate(current, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const r = await res.json();
    return compareVersions(r.tag_name, current) > 0 ? { version: String(r.tag_name).replace(/^v/, ''), url: r.html_url } : null;
  } catch { return null; }
}
