'use strict';

// Controller integration checks against a small, explicit DOM model.
// These verify event/state behavior; they are not browser, layout, or native
// constraint-validation certification. The managed preview supplies visual QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { baseline, fields } = require('../public/calculator.js');

function fixture({ realShell = false, href = 'https://importos.example/?lang=ar', reducedMotion = false } = {}) {
  let focused = null;
  class Element {
    constructor(id) {
      this.id = id;
      this.textContent = '';
      this.hidden = false;
      this.disabled = false;
      this.dataset = {};
      this.style = {};
      this.attributes = {};
      this.listeners = new Map();
      this._value = '';
      this._open = false;
      const classes = new Set();
      this.classList = {
        add: (...keys) => keys.forEach(key => classes.add(key)),
        remove: (...keys) => keys.forEach(key => classes.delete(key)),
        contains: key => classes.has(key),
        toggle: (key, enabled) => {
          if (enabled === undefined) enabled = !classes.has(key);
          enabled ? classes.add(key) : classes.delete(key);
          return enabled;
        }
      };
    }
    set value(value) { this._value = String(value); }
    get value() { return this._value; }
    set open(value) {
      const changed = this._open !== Boolean(value);
      this._open = Boolean(value);
      if (changed) this.dispatchEvent({ type: 'toggle' });
    }
    get open() { return this._open; }
    get validity() {
      if (!fields.includes(this.id)) return { valid: true };
      const n = Number(this.value);
      const valid = this.value.trim() !== '' && Number.isFinite(n) && n >= 0 &&
        (this.id !== 'units' || (Number.isInteger(n) && n >= 1 && n <= 1e9)) &&
        (!['taxRate', 'dutyRate'].includes(this.id) || n <= 100);
      return { valid };
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    dispatchEvent(event) {
      event.target ??= this;
      event.preventDefault ??= () => {};
      for (const listener of this.listeners.get(event.type) || []) listener(event);
      return true;
    }
    click() { if (!this.disabled) this.dispatchEvent({ type: 'click' }); }
    focus() { focused = this.id; }
    scrollIntoView(options) { this.lastScroll = options; }
  }

  const ids = [
    ...fields, 'shipment-form', 'assumptions', 'basis-warning',
    'basis-warning-text', 'confirm-bases', 'review-bases', 'result-basis-warning',
    'error', 'calc-status', 'estimate', 'total', 'subtotal', 'duty', 'tax',
    'extras', 'perUnit', 'baseline', 'higher-freight', 'try-example',
    'deadline-soon', 'deadline-later', 'compare-freight', 'compare-total-A',
    'compare-total-B', 'hero-total-A', 'hero-total-B', 'heroDelta',
    'hero-delta-label', 'unitA', 'unitB', 'cardA', 'cardB', 'statusA',
    'statusB', 'barA', 'barB', 'compare-freight-label', 'compare-freight-help',
    'verdict', 'reason', 'compare-difference', 'bFreight', 'bSum', 'bEach', 'outcome'
  ];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  for (const field of fields) nodes[field].value = baseline[field];
  const form = nodes['shipment-form'];
  form.querySelector = selector => selector === 'details.assumptions'
    ? nodes.assumptions
    : selector === 'input:invalid' ? fields.map(id => nodes[id]).find(el => !el.validity.valid) || null
      : null;
  nodes.assumptions.contains = element => ['dutyBase', 'dutyRate', 'taxBase', 'taxRate'].includes(element.id);
  form.checkValidity = () => {
    const invalid = fields.map(id => nodes[id]).filter(el => !el.validity.valid);
    invalid.forEach(el => form.dispatchEvent({ type: 'invalid', target: el }));
    return invalid.length === 0;
  };
  form.requestSubmit = () => {
    if (form.checkValidity()) form.dispatchEvent({ type: 'submit' });
  };

  const doc = new Element('document');
  doc.getElementById = id => nodes[id] || null;
  doc.documentElement = { lang: 'ar', dir: 'rtl' };
  const windowModel = new Element('window');
  const location = {};
  const updateLocation = value => {
    const url = new URL(value, location.href || href);
    for (const key of ['href', 'search', 'hash', 'protocol']) location[key] = url[key];
  };
  updateLocation(href);
  windowModel.location = location;
  windowModel.matchMedia = () => ({ matches: reducedMotion });
  const history = {
    state: null,
    pushState(state, _unused, url) { this.state = state; updateLocation(url); },
    replaceState(state, _unused, url) { this.state = state; updateLocation(url); }
  };
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const allElements = [];
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const attributes = Object.fromEntries([...match[2].matchAll(/([\w:-]+)="([^"]*)"/g)]
      .map(attribute => [attribute[1], attribute[2]]));
    const element = (attributes.id && nodes[attributes.id]) || new Element(attributes.id || 'element-' + allElements.length);
    if (attributes.id) nodes[attributes.id] = element;
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
      if (key.startsWith('data-')) element.dataset[key.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    }
    if (attributes['data-i18n']) {
      const rest = html.slice(match.index + match[0].length);
      element.textContent = rest.slice(0, rest.indexOf('</' + match[1] + '>')).replace(/<[^>]*>/g, '');
    }
    allElements.push(element);
  }
  doc.querySelectorAll = selector => {
    const match = selector.match(/^\[([\w-]+)\]$/);
    if (!match) throw new Error('Unsupported test-model selector: ' + selector);
    return allElements.filter(element => element.getAttribute(match[1]) !== null);
  };
  let lang = 'ar';
  const dictionaries = { ar: {}, en: {} };
  let ui = {
    register(translations) {
      for (const key of ['ar', 'en']) Object.assign(dictionaries[key], translations[key]);
    },
    t(key, values = {}) {
      let value = dictionaries[lang][key];
      if (value === undefined) throw new Error('Missing controller translation: ' + lang + ':' + key);
      return value.replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? '{' + token + '}'));
    },
    number: (value, decimals = 0) => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(value),
    money(value) { return ui.number(value, 2) + (lang === 'ar' ? ' ر.س' : ' SAR'); },
    apply() {},
    pulse() {}
  };
  windowModel.ImportOS = ui;
  const context = vm.createContext({
    document: doc, window: windowModel, queueMicrotask, location, history, URL, URLSearchParams,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    setTimeout: () => 0, clearTimeout() {}
  });
  for (const file of realShell ? ['i18n.js', 'app.js', 'compare.js', 'calculator.js'] : ['calculator.js', 'compare.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public', file), 'utf8'), context, { filename: file });
  }
  if (realShell) ui = windowModel.ImportOS;
  return {
    nodes, form, ui, doc, windowModel, location, history,
    focused: () => focused,
    input(id, value) {
      nodes[id].value = value;
      form.dispatchEvent({ type: 'input', target: nodes[id] });
    },
    language(next) {
      if (realShell) ui.setLanguage(next);
      else { lang = next; doc.dispatchEvent({ type: 'importos:language' }); }
    },
    values: () => Object.fromEntries(fields.map(id => [id, nodes[id].value]))
  };
}

test('calculator event flow produces all three reviewed totals without silently changing bases', () => {
  const f = fixture();
  f.form.requestSubmit();
  assert.equal(f.nodes.total.textContent, '13,803.25');
  f.input('freight', 1500);
  assert.equal(f.nodes.total.textContent, '—');
  assert.equal(f.nodes.dutyBase.value, '11100');
  assert.equal(f.nodes.taxBase.value, '11655');
  f.form.requestSubmit();
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  f.nodes['higher-freight'].click();
  assert.equal(f.nodes.total.textContent, '14,407.00');
  assert.equal(f.nodes.dutyBase.value, '11600');
  assert.equal(f.nodes.taxBase.value, '12180');
  assert.equal(f.nodes['basis-warning'].hidden, true);
});

test('language event retains calculator inputs, displayed result and pending review', () => {
  const f = fixture();
  f.input('freight', 1500);
  f.form.requestSubmit();
  const values = f.values();
  f.language('en');
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.equal(f.nodes['basis-warning'].hidden, false);
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  assert.match(f.nodes['basis-warning-text'].textContent, /manual/);
  assert.match(f.nodes.perUnit.textContent, /per unit/);
  f.language('ar');
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.match(f.nodes['basis-warning-text'].textContent, /يدوية/);
});

test('open/review/acknowledge flow preserves bases and tracks subsequent changes', () => {
  const f = fixture();
  f.input('freight', 1500);
  assert.equal(f.nodes['confirm-bases'].disabled, true);
  f.nodes['confirm-bases'].click();
  assert.equal(f.nodes['basis-warning'].hidden, false);
  f.nodes['review-bases'].click();
  assert.equal(f.nodes.assumptions.open, true);
  assert.equal(f.focused(), 'dutyBase');
  assert.equal(f.nodes['confirm-bases'].disabled, false);
  const values = f.values();
  f.nodes['confirm-bases'].click();
  assert.equal(f.nodes['basis-warning'].hidden, true);
  assert.deepEqual(f.values(), values);
  f.language('en');
  assert.equal(f.nodes['basis-warning'].hidden, true);
  f.input('freight', 1700);
  assert.equal(f.nodes['basis-warning'].hidden, false);
  f.input('freight', 1500);
  assert.equal(f.nodes['basis-warning'].hidden, true);
});

test('editing one duty dependency focuses the tax base and warns only about that base', () => {
  const f = fixture();
  f.input('dutyRate', 8);
  f.language('en');
  f.nodes['review-bases'].click();
  assert.equal(f.focused(), 'taxBase');
  assert.match(f.nodes['basis-warning-text'].textContent, /import-tax base/);
  assert.equal(f.nodes.taxBase.value, '11655');
});

test('invalid event clears stale result and provisional label, and cannot acknowledge invalid fields', async () => {
  const f = fixture();
  f.input('freight', 1500);
  f.form.requestSubmit();
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  f.nodes['review-bases'].click();
  // Simulate invalid content arriving before the validation event is raised.
  f.nodes.taxRate.value = '101';
  f.nodes['confirm-bases'].click();
  await Promise.resolve();
  assert.equal(f.nodes.total.textContent, '—');
  assert.equal(f.nodes['result-basis-warning'].hidden, true);
  assert.equal(f.nodes['basis-warning'].hidden, false);
  assert.notEqual(f.nodes.error.textContent, '');
  assert.equal(f.nodes.taxRate.getAttribute('aria-invalid'), 'true');
  assert.equal(f.focused(), 'taxRate');
});

test('comparison state and costs survive language switches without affecting calculator inputs', () => {
  const f = fixture();
  f.input('goods', 12345);
  const values = f.values();
  f.nodes['deadline-later'].click();
  assert.equal(f.nodes.cardB.classList.contains('is-selected'), true);
  f.nodes['compare-freight'].click();
  assert.equal(f.nodes['compare-total-B'].textContent, '12,700');
  assert.equal(f.nodes.cardA.classList.contains('is-selected'), true);
  f.language('en');
  assert.equal(f.nodes['deadline-later'].getAttribute('aria-pressed'), 'true');
  assert.equal(f.nodes['compare-freight'].getAttribute('aria-pressed'), 'true');
  assert.equal(f.nodes['compare-total-B'].textContent, '12,700');
  assert.match(f.nodes.verdict.textContent, /A is faster/);
  assert.deepEqual(f.values(), values);
  f.nodes['compare-freight'].click();
  assert.equal(f.nodes['compare-total-B'].textContent, '12,200');
  assert.equal(f.nodes.cardB.classList.contains('is-selected'), true);
  assert.match(f.nodes.verdict.textContent, /B costs less/);
});

test('preset restores the calculator without resetting the comparison scenario', () => {
  const f = fixture();
  f.nodes['deadline-later'].click();
  f.nodes['compare-freight'].click();
  f.input('goods', 32000);
  f.nodes.baseline.click();
  assert.equal(f.nodes.total.textContent, '13,803.25');
  assert.equal(f.nodes['basis-warning'].hidden, true);
  assert.equal(f.nodes['compare-total-B'].textContent, '12,700');
  assert.equal(f.nodes['deadline-later'].getAttribute('aria-pressed'), 'true');
});

test('calculator navigation links preserve inputs instead of invoking the example-reset binding', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const links = [...html.matchAll(/<a\b[^>]*\bdata-go="calculator"[^>]*>/g)].map(match => match[0]);
  assert.ok(links.length > 0, 'The unified site has calculator navigation');
  for (const link of links) {
    assert.doesNotMatch(link, /\bid="(?:try-example|baseline|higher-freight)"/,
      'Generic navigation must not be connected to a preset reset');
  }
});

test('actual language and routing scripts retain both tools, inputs, results and review state', () => {
  const f = fixture({ realShell: true, href: 'https://importos.example/?source=qa#calculator' });
  assert.equal(f.nodes['calculator-panel'].hidden, false);
  assert.equal(f.nodes['compare-panel'].hidden, true);
  f.input('freight', 1500);
  f.form.requestSubmit();
  f.nodes['deadline-later'].click();
  f.nodes['compare-freight'].click();
  const values = f.values();
  f.nodes['language-toggle'].click();
  assert.equal(f.doc.documentElement.lang, 'en');
  assert.equal(f.doc.documentElement.dir, 'ltr');
  assert.equal(f.location.hash, '#calculator');
  assert.equal(new URLSearchParams(f.location.search).get('lang'), 'en');
  assert.equal(new URLSearchParams(f.location.search).get('source'), 'qa');
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.match(f.nodes.perUnit.textContent, /SAR 143\.03 per unit/);
  assert.match(f.nodes['calc-status'].textContent, /Bases need review/);
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  assert.equal(f.nodes['compare-total-B'].textContent, '12,700');
  assert.equal(f.nodes['deadline-later'].getAttribute('aria-pressed'), 'true');
  f.nodes['tab-compare'].click();
  assert.equal(f.nodes['compare-panel'].hidden, false);
  assert.equal(f.nodes['calculator-panel'].hidden, true);
  f.nodes['tab-calculator'].click();
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, '14,303.25');
  f.nodes['language-toggle'].click();
  assert.equal(f.doc.documentElement.dir, 'rtl');
  assert.match(f.nodes['basis-warning-text'].textContent, /يدوية/);
  assert.equal(f.nodes.total.textContent, '14,303.25');
});

test('all static English labels exist and comparison exclusions remain explicit in both languages', () => {
  const f = fixture({ realShell: true, href: 'https://importos.example/?lang=en#compare' });
  for (const attribute of ['data-i18n', 'data-i18n-aria', 'data-i18n-title', 'data-i18n-placeholder']) {
    for (const element of f.doc.querySelectorAll('[' + attribute + ']')) {
      const key = element.getAttribute(attribute);
      assert.equal(typeof f.ui.messages.en[key], 'string', 'Missing English label: ' + key);
      assert.notEqual(f.ui.messages.en[key].trim(), '', 'Empty English label: ' + key);
    }
  }
  assert.match(f.ui.t('compare.exclusions'), /excludes tax, duty, insurance/);
  f.language('ar');
  assert.match(f.ui.t('compare.exclusions'), /الضريبة/);
  assert.match(f.ui.t('compare.exclusions'), /الجمارك/);
  assert.match(f.ui.t('compare.exclusions'), /التأمين/);
});

test('tab keyboard controls follow direction and reduced-motion avoids transition classes', () => {
  const f = fixture({ realShell: true, reducedMotion: true });
  f.nodes['tab-compare'].dispatchEvent({ type: 'keydown', key: 'ArrowLeft' });
  assert.equal(f.nodes['calculator-panel'].hidden, false);
  assert.equal(f.focused(), 'tab-calculator');
  assert.equal(f.nodes['calculator-panel'].classList.contains('panel-enter'), false);
  f.form.requestSubmit();
  assert.equal(f.nodes.estimate.classList.contains('result-updated'), false);
  f.language('en');
  f.nodes['tab-calculator'].dispatchEvent({ type: 'keydown', key: 'Home' });
  assert.equal(f.nodes['compare-panel'].hidden, false);
  f.nodes['tab-compare'].dispatchEvent({ type: 'keydown', key: 'ArrowRight' });
  assert.equal(f.nodes['calculator-panel'].hidden, false);
  assert.equal(f.focused(), 'tab-calculator');
});

test('history navigation restores route and language without losing shipment values', () => {
  const f = fixture({ realShell: true });
  f.input('goods', 18760);
  f.form.requestSubmit();
  const result = f.nodes.total.textContent;
  const values = f.values();
  Object.assign(f.location, {
    href: 'https://importos.example/?lang=en#calculator', search: '?lang=en', hash: '#calculator'
  });
  f.windowModel.dispatchEvent({ type: 'popstate' });
  assert.equal(f.ui.lang, 'en');
  assert.equal(f.nodes['calculator-panel'].hidden, false);
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, result);
  Object.assign(f.location, {
    href: 'https://importos.example/#compare', search: '', hash: '#compare'
  });
  f.windowModel.dispatchEvent({ type: 'popstate' });
  assert.equal(f.ui.lang, 'ar');
  assert.equal(f.nodes['compare-panel'].hidden, false);
  assert.deepEqual(f.values(), values);
});

test('legacy comparison link preserves language and other search parameters on the unified route', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/compare.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  let destination;
  const original = new URL('https://importos.example/demo/compare.html?lang=en&source=bookmark#workspace');
  vm.runInNewContext(script, {
    URL,
    window: { location: { href: original.href, search: original.search, replace: value => { destination = value; } } }
  });
  assert.equal(destination, 'https://importos.example/demo/?lang=en&source=bookmark#compare');
});

test('offline file preview keeps language, tabs and shipment state usable without History API writes', () => {
  const f = fixture({ realShell: true, href: 'file:///tmp/importos/index.html' });
  f.history.pushState = f.history.replaceState = () => { throw new Error('History writes unavailable for this file preview'); };
  f.input('freight', 1500);
  f.form.requestSubmit();
  const values = f.values();
  f.nodes['tab-calculator'].click();
  f.nodes['language-toggle'].click();
  assert.equal(f.nodes['calculator-panel'].hidden, false);
  assert.equal(f.doc.documentElement.lang, 'en');
  assert.equal(f.doc.documentElement.dir, 'ltr');
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  assert.deepEqual(f.values(), values);
  f.nodes['tab-compare'].click();
  f.nodes['tab-calculator'].click();
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, '14,303.25');
  assert.equal(f.location.href, 'file:///tmp/importos/index.html');
});
