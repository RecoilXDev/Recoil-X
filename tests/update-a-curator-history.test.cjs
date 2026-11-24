const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { makeHarness } = require('./helpers/dom-harness.cjs');

function mountStudio() {
  const h = makeHarness();
  const host = h.ui.createElement('div');
  new vm.Script(fs.readFileSync(__dirname + '/../server/a-curator.js', 'utf8')).runInContext(h.ctx);
  h.ctx.RXCurator.mount(host, new AbortController().signal);
  const buttons = host.querySelectorAll('button');
  return {
    host,
    button: label => buttons.find(b => b.textContent === label),
    cell: (x, z) => buttons.find(b => b.getAttribute('aria-label') === 'Cell ' + x + ', ' + z),
    kind: host.querySelectorAll('select').find(s => s.options.some(o => o.value === 'spawn')),
    key: (target, key, modifiers) => {
      let handled = false;
      host.firstElementChild.dispatchEvent({
        type: 'keydown', target, key, ...modifiers, preventDefault() { handled = true; }
      });
      return handled;
    },
    ctx: h.ctx
  };
}

test('Curator undo restores both tiles after moving a spawn and leaves text-field shortcuts alone', () => {
  const { host, cell, button, kind, key } = mountStudio();
  const origin = cell(0, 0), target = cell(3, 2);
  const undo = button('Undo'), redo = button('Redo');
  assert.equal(undo.disabled, true);
  kind.value = 'spawn';
  target.click();
  assert.equal(origin.title, 'Empty');
  assert.equal(target.title, 'spawn');
  assert.equal(key(host.querySelector('input'), 'z', { ctrlKey: true }), false);
  assert.equal(key(target, 'z', { metaKey: true }), true);
  assert.equal(origin.title, 'spawn');
  assert.equal(target.title, 'target');
  assert.equal(undo.disabled, true);
  // Placing the same tile again does not consume the available redo.
  origin.click();
  assert.equal(redo.disabled, false);
  assert.equal(key(target, 'Z', { ctrlKey: true, shiftKey: true }), true);
  assert.equal(origin.title, 'Empty');
  assert.equal(target.title, 'spawn');
  target.click(); // Select the existing spawn's coordinates for Erase.
  button('Erase').click();
  assert.equal(target.title, 'Empty');
  undo.click();
  assert.equal(target.title, 'spawn');
  kind.value = 'wall';
  target.click();
  assert.equal(redo.disabled, true);
  button('New project').click();
  assert.equal(undo.disabled, true);
  assert.equal(origin.title, 'spawn');
});

test('Curator playtests lock grid history and each draft retains up to 32 edits', () => {
  const { cell, button } = mountStudio();
  const undo = button('Undo'), redo = button('Redo');
  const placed = [];
  for (let z = -8; placed.length < 33; z++) {
    for (let x = -8; x <= 8 && placed.length < 33; x++) {
      const tile = cell(x, z);
      tile.click();
      placed.push(tile);
    }
  }
  button('Playtest').click();
  assert.equal(undo.disabled, true);
  assert.equal(redo.disabled, true);
  button('Stop').click();
  assert.equal(undo.disabled, false);
  for (let i = 0; i < 32; i++) undo.click();
  assert.equal(undo.disabled, true);
  assert.equal(placed[0].title, 'block');
  assert.ok(placed.slice(1).every(tile => tile.title === 'Empty'));
});

test('Curator saves the selected grid version and retains undo after the first save', async () => {
  const { ctx, cell, button } = mountStudio();
  ctx.sessionStorage.setItem('rx5-token', 'local-test-session');
  const saved = [];
  ctx.fetch = async (url, options) => {
    if (!url.endsWith('/save')) return { ok: true, json: async () => ({ projects: [] }) };
    const body = JSON.parse(options.body);
    saved.push(body);
    return { ok: true, json: async () => ({ project: { ...body, id: 'saved-draft', updated: saved.length, published: false } }) };
  };
  // Allow the initial project-list request to finish before pressing Save.
  await new Promise(resolve => setImmediate(resolve));
  cell(1, 1).click();
  await button('Save').onclick();
  button('Undo').click();
  await button('Save').onclick();
  assert.equal(saved.length, 2);
  assert.ok(saved[0].objects.some(o => o.x === 1 && o.z === 1));
  assert.equal(saved[1].id, 'saved-draft');
  assert.ok(!saved[1].objects.some(o => o.x === 1 && o.z === 1));
});
