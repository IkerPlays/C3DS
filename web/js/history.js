// Historial de deshacer/rehacer basado en instantáneas JSON (los recursos binarios `blobs` no se copian).
export const snapshot = (project) => JSON.stringify(project, (k, v) => (k === 'blobs' ? undefined : v));

export class History {
  constructor(project, limit = 100) {
    this.project = project;
    this.limit = limit;
    this.stack = [snapshot(project)];
    this.pos = 0;
  }

  /** Registra el estado actual si ha cambiado. Devuelve true si se añadió una entrada. */
  commit() {
    const s = snapshot(this.project);
    if (s === this.stack[this.pos]) return false;
    this.stack.length = this.pos + 1;
    this.stack.push(s);
    if (this.stack.length > this.limit) this.stack.shift();
    this.pos = this.stack.length - 1;
    return true;
  }

  get canUndo() { return this.pos > 0; }
  get canRedo() { return this.pos < this.stack.length - 1; }

  #apply(i) {
    const data = JSON.parse(this.stack[i]);
    for (const k of Object.keys(this.project)) if (k !== 'blobs') delete this.project[k];
    Object.assign(this.project, data);
    this.pos = i;
  }

  undo() { if (this.canUndo) { this.#apply(this.pos - 1); return true; } return false; }
  redo() { if (this.canRedo) { this.#apply(this.pos + 1); return true; } return false; }
  reset() { this.stack = [snapshot(this.project)]; this.pos = 0; }
}
