// Detección del motor / tipo de proyecto a partir de la lista de rutas.
const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');

export const ENGINES = {
  unity: { label: 'Unity' },
  godot: { label: 'Godot' },
  unreal: { label: 'Unreal Engine' },
  exe: { label: 'Ejecutable de Windows (.exe)' },
  unknown: { label: 'No reconocido' },
};

/** @param {string[]} rawPaths */
export function detectEngine(rawPaths) {
  const paths = rawPaths.map(norm);
  const find = (re) => paths.find((p) => re.test(p));

  const unityVer = find(/(^|\/)ProjectSettings\/ProjectVersion\.txt$/i);
  if (unityVer || (find(/(^|\/)Assets\//) && find(/(^|\/)ProjectSettings\//i))) {
    return { engine: 'unity', versionFile: unityVer || null };
  }
  const godot = find(/(^|\/)project\.godot$/i);
  if (godot) return { engine: 'godot', versionFile: godot };
  const uproject = find(/\.uproject$/i);
  if (uproject) return { engine: 'unreal', versionFile: uproject };
  if (paths.length === 1 && /\.exe$/i.test(paths[0])) return { engine: 'exe', versionFile: null };
  return { engine: 'unknown', versionFile: null };
}

export function parseEngineVersion(engine, text) {
  if (!text) return null;
  if (engine === 'unity') return /m_EditorVersion:\s*([^\s]+)/.exec(text)?.[1] ?? null;
  if (engine === 'godot') {
    const feat = /config\/features\s*=\s*PackedStringArray\(([^)]*)\)/.exec(text)?.[1];
    return feat ? (/"(\d+\.\d+)"/.exec(feat)?.[1] ?? null) : null;
  }
  if (engine === 'unreal') {
    try { return JSON.parse(text).EngineAssociation || null; } catch { return null; }
  }
  return null;
}
