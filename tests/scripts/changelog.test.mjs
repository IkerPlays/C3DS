import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSection } from '../../scripts/changelog.mjs';

const md = `# Changelog

## [Unreleased]
- nada

## [1.2.0] - 2026-01-02
### Añadido
- Cosa A

## [1.1.0] - 2025-12-01
- Cosa B

[1.2.0]: https://example.com
`;
test('extrae una sección', () => {
  assert.equal(extractSection(md, 'v1.2.0'), '### Añadido\n- Cosa A');
  assert.equal(extractSection(md, '1.1.0'), '- Cosa B');
  assert.equal(extractSection(md, 'Unreleased'), '- nada');
  assert.equal(extractSection(md, '9.9.9'), null);
});
