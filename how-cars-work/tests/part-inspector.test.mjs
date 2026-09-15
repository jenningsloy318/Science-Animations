// part-inspector.test.mjs — Phase 1 RED tests for
// how-cars-work/js/part-inspector-data.js and its main.js wiring.
// Covers SCENARIO-016 (clicking a new part opens the existing inspectorCard
// with a kid-level bilingual title/description) and SCENARIO-017 (every one of
// the 21 new parts is registered into inspectableObjects; the final inspectable
// count equals BASELINEInspectableCount + 21).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, readSource, readSiteFile, ALL_PART_IDS, hasCjk, hasLatin } from './helpers.mjs';

async function importPartInfo() {
  const mod = await loadModule('part-inspector-data.js');
  return mod.PART_INFO;
}

test('SCENARIO-016: PART_INFO defines a kid-level bilingual entry for every one of the 21 new partIds — none missing', async () => {
  const PART_INFO = await importPartInfo();
  assert.ok(PART_INFO && typeof PART_INFO === 'object', 'part-inspector-data.js must export const PART_INFO');
  assert.deepEqual(
    Object.keys(PART_INFO).sort(),
    [...ALL_PART_IDS].sort(),
    'PART_INFO keys must be exactly the closed 21-part id set (no part clickable-but-silent)'
  );
});

test('SCENARIO-016: each entry carries nameZh/nameEn/kidDesc where kidDesc is 简体中文-first with English key terms (e.g. 散热器 Radiator — 像小水箱一样给发动机降温)', async () => {
  const PART_INFO = await importPartInfo();
  for (const id of ALL_PART_IDS) {
    const info = PART_INFO[id];
    assert.ok(info, `entry for "${id}" must exist`);
    assert.equal(typeof info.nameZh, 'string', `"${id}".nameZh must be a string`);
    assert.equal(typeof info.nameEn, 'string', `"${id}".nameEn must be a string`);
    assert.equal(typeof info.kidDesc, 'string', `"${id}".kidDesc must be a string`);
    assert.ok(hasCjk(info.nameZh), `"${id}".nameZh must be Simplified Chinese`);
    assert.ok(hasLatin(info.nameEn), `"${id}".nameEn must carry the English key term`);
    assert.ok(hasCjk(info.kidDesc), `"${id}".kidDesc must be Chinese-first for a 9-year-old`);
    assert.ok(hasLatin(info.kidDesc), `"${id}".kidDesc must include English key terms (中英混排)`);
    assert.ok(info.kidDesc.length >= 6, `"${id}".kidDesc must be a real explanation, not a stub`);
  }
});

test('SCENARIO-016: the radiator example reads 散热器 Radiator — 像小水箱一样给发动机降温 style bilingual text', async () => {
  const PART_INFO = await importPartInfo();
  const radiator = PART_INFO.radiator;
  assert.ok(radiator, 'PART_INFO.radiator must exist (the spec-named example part)');
  assert.ok(radiator.nameZh.includes('散热器'), 'nameZh for radiator must contain 散热器');
  assert.ok(/radiator/i.test(radiator.nameEn), 'nameEn for radiator must contain Radiator');
  assert.ok(
    radiator.kidDesc.includes('降温') || radiator.kidDesc.includes('散热') || radiator.kidDesc.includes('冷却'),
    'kidDesc for radiator must explain cooling in kid terms'
  );
});

test('SCENARIO-017: main.js imports buildSubsystems and PART_INFO and registers every new mesh into inspectableObjects so no new part is dead on click', async () => {
  const src = readSource('main.js');
  assert.match(src, /from\s+['"]\.\/car-subsystems\.js['"]/, 'main.js must import the new car-subsystems.js module');
  assert.match(src, /buildSubsystems\s*\(/, 'main.js must call buildSubsystems to build the five groups');
  assert.match(src, /from\s+['"]\.\/part-inspector-data\.js['"]/, 'main.js must import PART_INFO from part-inspector-data.js');
  assert.match(src, /PART_INFO/, 'main.js must use PART_INFO');
  assert.match(src, /inspectableObjects\s*\.\s*push\s*\(/, 'main.js must push the new meshes into parts.inspectableObjects');
  assert.match(src, /userData\.partId/, 'main.js must register meshes by their userData.partId tag');
});

test('SCENARIO-017: main.js records BASELINEInspectableCount and asserts the final inspectable count equals baseline + 21', async () => {
  const src = readSource('main.js');
  assert.match(src, /BASELINEInspectableCount/, 'main.js must record the pre-change baseline inspectable count');
  assert.match(src, /BASELINEInspectableCount\s*\+\s*21/, 'main.js must assert final count = BASELINEInspectableCount + 21');
});

test('SCENARIO-016: clicks open the existing inspectorCard — inspTitle gets the bilingual name and inspDesc the kid-level description', async () => {
  const mainSrc = readSource('main.js');
  assert.match(mainSrc, /inspTitle\s*\.\s*(?:innerText|textContent)\s*=/, 'main.js must set the inspTitle element text');
  assert.match(mainSrc, /inspDesc\s*\.\s*(?:innerText|textContent)\s*=/, 'main.js must set the inspDesc element text');
  assert.match(mainSrc, /PART_INFO/, 'the inspector text must come from PART_INFO (bilingual name + kidDesc)');
  const html = readSiteFile('index.html');
  assert.match(html, /id=["']inspectorCard["']/, 'index.html must keep the existing inspectorCard element');
  assert.match(html, /id=["']inspTitle["']/, 'index.html must keep inspTitle');
  assert.match(html, /id=["']inspDesc["']/, 'index.html must keep inspDesc');
});
