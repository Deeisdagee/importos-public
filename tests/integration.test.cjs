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

const testFxRows = () => Object.entries({ SAR: 3.75, EUR: 0.91, GBP: 0.76, CNY: 6.7, INR: 92.8, JPY: 159.3 })
  .map(([quote, rate]) => ({ base: 'USD', quote, rate, date: '2026-11-22' }));

function fixture({
  realShell = false, href = 'https://importos.example/?lang=ar', reducedMotion = false,
  fxFetch, fxNow = Date.parse('2026-11-22T12:00:00Z')
} = {}) {
  let focused = null;
  class TextNode {
    constructor(text) { this.nodeType = 3; this.textContent = String(text); }
  }
  class Element {
    constructor(id) {
      this.id = id;
      this.nodeType = 1;
      this.tagName = '';
      this._text = '';
      this.childNodes = [];
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
    set textContent(value) { this._text = String(value); this.childNodes = []; }
    get textContent() { return this.childNodes.length ? this.childNodes.map(node => node.textContent).join('') : this._text; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get options() { return this.children.filter(node => node.tagName === 'OPTION'); }
    append(...items) {
      if (this._text) { this.childNodes.push(new TextNode(this._text)); this._text = ''; }
      for (const item of items) {
        const node = typeof item === 'string' ? new TextNode(item) : item;
        if (node.nodeType === 11) this.childNodes.push(...node.childNodes);
        else this.childNodes.push(node);
      }
    }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...items) { this.childNodes = []; this._text = ''; this.append(...items); }
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
  doc.createElement = tag => { const element = new Element(''); element.tagName = tag.toUpperCase(); return element; };
  doc.createElementNS = (_namespace, tag) => doc.createElement(tag);
  doc.createTextNode = text => new TextNode(text);
  doc.createDocumentFragment = () => { const fragment = new Element(''); fragment.nodeType = 11; return fragment; };
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
    const attributes = Object.fromEntries([...match[2].matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
      .map(attribute => [attribute[1], attribute[2] ?? attribute[3] ?? attribute[4] ?? '']));
    const element = (attributes.id && nodes[attributes.id]) || new Element(attributes.id || 'element-' + allElements.length);
    element.tagName = match[1].toUpperCase();
    if (attributes.id) nodes[attributes.id] = element;
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
      if (key.startsWith('data-')) element.dataset[key.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    }
    if (attributes.value !== undefined) element.value = attributes.value;
    if (element.tagName === 'OPTION' && nodes['currency-select']) nodes['currency-select'].appendChild(element);
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
  let ui;
  const requests = [];
  const timers = new Map();
  let nextTimer = 1;
  const fetchModel = (url, options = {}) => {
    requests.push({ url, options });
    return fxFetch ? fxFetch(url, options) : Promise.resolve({ ok: true, json: async () => testFxRows() });
  };
  windowModel.fetch = fetchModel;
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [fxNow])); }
    static now() { return fxNow; }
  }
  const context = vm.createContext({
    document: doc, window: windowModel, queueMicrotask, location, history, URL, URLSearchParams,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    AbortController, DOMException, fetch: fetchModel, Date: ClockDate,
    setTimeout(callback, duration) { const id = nextTimer++; timers.set(id, { callback, duration }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  const runtimeFiles = ['i18n.js', ...(realShell ? ['currency.js', 'app.js'] : []), 'compare.js', 'calculator.js'];
  for (const file of runtimeFiles) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public', file), 'utf8'), context, { filename: file });
  }
  ui = windowModel.ImportOS;
  return {
    nodes, form, ui, doc, windowModel, location, history, requests, timers,
    ready: () => new Promise(resolve => setImmediate(resolve)),
    advanceTime(milliseconds) { fxNow += milliseconds; },
    focused: () => focused,
    input(id, value) {
      nodes[id].value = value;
      form.dispatchEvent({ type: 'input', target: nodes[id] });
    },
    language(next) { ui.setLanguage(next); },
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
  assert.match(f.nodes.perUnit.textContent, /(?:SAR|Saudi riyal) 143\.03 per unit/);
  assert.match(f.nodes['calc-status'].textContent, /Bases need review/);
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  assert.equal(f.nodes['compare-total-B'].textContent, '12,700.00');
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

test('all display currencies round-trip without changing canonical inputs, rates, units or reviewed status', async () => {
  const f = fixture({ realShell: true });
  await f.ready();
  assert.ok(f.ui.fx.snapshot);
  f.form.requestSubmit();
  const initial = f.values();
  const codes = ['USD', 'EUR', 'GBP', 'CNY', 'INR', 'JPY', 'SAR'];
  for (let round = 0; round < 3; round++) {
    for (const code of codes) {
      assert.equal(f.ui.fx.requestCurrency(code), true, 'Could not select ' + code);
      if (code === 'USD') {
        // Equivalent input must not turn the rounded display into a new
        // canonical value, even after repeated currency changes.
        f.input('goods', f.nodes.goods.value + (f.nodes.goods.value.includes('.') ? '0' : '.0'));
        f.form.requestSubmit();
      }
      assert.equal(f.nodes.units.value, initial.units);
      assert.equal(f.nodes.dutyRate.value, initial.dutyRate);
      assert.equal(f.nodes.taxRate.value, initial.taxRate);
      assert.equal(f.nodes['basis-warning'].hidden, true);
      assert.equal(f.nodes['result-basis-warning'].hidden, true);
    }
  }
  assert.deepEqual(f.values(), initial);
  assert.equal(f.nodes.total.textContent, '13,803.25');
  assert.equal(f.requests.length, 1, 'Changing currency must reuse one dated snapshot');
});

test('USD entry is interpreted in USD while manual bases stay independent and all results agree', async () => {
  const f = fixture({ realShell: true, href: 'https://importos.example/?lang=en#calculator' });
  await f.ready();
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  assert.equal(f.nodes.dutyBase.value, '2960');
  assert.equal(f.nodes.taxBase.value, '3108');
  f.input('goods', '1000');
  f.form.requestSubmit();
  assert.equal(f.nodes.total.textContent, '2,014.20');
  assert.equal(f.nodes['basis-warning'].hidden, false);
  assert.equal(f.nodes.dutyBase.value, '2960');
  assert.equal(f.nodes.taxBase.value, '3108');
  assert.equal(f.nodes['compare-total-A'].textContent, '3,333.33');
  assert.equal(f.nodes['compare-total-B'].textContent, '3,253.33');
  assert.equal(f.ui.fx.requestCurrency('SAR'), true);
  assert.equal(f.nodes.goods.value, '3750');
  assert.equal(f.nodes.dutyBase.value, '11100');
  assert.equal(f.nodes.taxBase.value, '11655');
  assert.equal(f.nodes.total.textContent, '7,553.25');
});

test('currency and language changes preserve a pending review and a subsequent acknowledgement', async () => {
  const f = fixture({ realShell: true });
  await f.ready();
  f.input('freight', 1500);
  f.form.requestSubmit();
  f.nodes['review-bases'].click();
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  f.language('en');
  assert.equal(f.nodes.total.textContent, '3,814.20');
  assert.equal(f.nodes['basis-warning'].hidden, false);
  assert.equal(f.nodes['result-basis-warning'].hidden, false);
  assert.equal(f.nodes.assumptions.open, true);
  f.nodes['confirm-bases'].click();
  assert.equal(f.nodes['basis-warning'].hidden, true);
  assert.equal(f.ui.fx.requestCurrency('JPY'), true);
  f.language('ar');
  assert.equal(f.nodes['basis-warning'].hidden, true);
  assert.equal(f.nodes['result-basis-warning'].hidden, true);
  assert.equal(f.ui.fx.requestCurrency('SAR'), true);
  assert.equal(f.nodes.freight.value, '1500');
  assert.equal(f.nodes.total.textContent, '14,303.25');
  f.input('dutyRate', 6);
  assert.equal(f.nodes['basis-warning'].hidden, false);
  assert.match(f.nodes['basis-warning-text'].textContent, /أساس ضريبة الاستيراد/);
});

test('invalid monetary inputs block a currency switch atomically and remain available for correction', async () => {
  const f = fixture({ realShell: true });
  await f.ready();
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  f.input('goods', '');
  const values = f.values();
  const snapshot = f.ui.fx.snapshot;
  assert.equal(f.ui.fx.requestCurrency('EUR'), false);
  assert.equal(f.ui.fx.currency, 'USD');
  assert.equal(f.ui.fx.snapshot, snapshot);
  assert.equal(f.nodes['currency-select'].value, 'USD');
  assert.deepEqual(f.values(), values);
  assert.notEqual(f.nodes.error.textContent, '');
  assert.equal(f.nodes.total.textContent, '—');
  f.input('goods', '1000');
  assert.equal(f.ui.fx.requestCurrency('EUR'), true);
  assert.equal(f.ui.fx.currency, 'EUR');
});

test('invalid unit/rate state survives monetary conversion and is still rejected on calculation', async () => {
  const f = fixture({ realShell: true });
  await f.ready();
  f.input('units', '0');
  f.input('taxRate', '101');
  f.form.requestSubmit();
  const error = f.nodes.error.textContent;
  assert.notEqual(error, '');
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  assert.equal(f.nodes.units.value, '0');
  assert.equal(f.nodes.taxRate.value, '101');
  assert.equal(f.nodes.error.textContent, error);
  assert.equal(f.nodes.total.textContent, '—');
  f.form.requestSubmit();
  assert.equal(f.nodes.total.textContent, '—');
  assert.notEqual(f.nodes.error.textContent, '');
});

test('currency rendering updates static and dynamic amounts in both languages with the right precision', async () => {
  const f = fixture({ realShell: true });
  await f.ready();
  f.input('goods', '10000.01');
  f.form.requestSubmit();
  assert.equal(f.ui.fx.requestCurrency('JPY'), true);
  assert.match(f.nodes.total.textContent, /^\d{1,3}(?:,\d{3})*$/);
  assert.match(f.nodes.goods.value, /\./, 'JPY inputs must retain conversion precision');
  const values = f.values();
  const amount = f.nodes.total.textContent;
  for (const language of ['en', 'ar']) {
    f.language(language);
    assert.equal(f.ui.fx.currency, 'JPY');
    assert.deepEqual(f.values(), values);
    assert.equal(f.nodes.total.textContent, amount);
    for (const node of f.doc.querySelectorAll('[data-currency-symbol]')) {
      assert.equal(node.children[0].textContent, 'JP¥');
      assert.match(node.getAttribute('title'), /JPY/);
    }
    for (const node of f.doc.querySelectorAll('[data-money-sar]')) {
      const expected = f.ui.fx.number(Number(node.dataset.moneySar));
      assert.ok(node.textContent.includes(expected));
      assert.ok(node.textContent.includes('JP¥'));
    }
    assert.doesNotMatch(f.nodes.perUnit.textContent, /\{amount\}|\[object Object\]/);
    assert.doesNotMatch(f.nodes.reason.textContent, /\{\w+\}|\[object Object\]/);
  }
  assert.equal(f.requests.length, 1, 'Language toggles must not request rates');
  assert.equal(f.ui.fx.requestCurrency('SAR'), true);
  for (const node of f.doc.querySelectorAll('[data-currency-symbol]')) {
    assert.match(node.children[0].className, /currency-symbol--sar/);
    assert.equal(node.children[0].getAttribute('aria-hidden'), 'true');
    assert.notEqual(node.children[1].textContent.trim(), '');
  }
});

test('failed or unusable initial FX responses leave SAR calculations functional and foreign choices unavailable', async () => {
  const cases = [
    async () => { throw new Error('Network unavailable'); },
    async () => ({ ok: false, json: async () => testFxRows() }),
    async () => ({ ok: true, json: async () => testFxRows().slice(1) }),
    async () => ({ ok: true, json: async () => testFxRows().map(row => ({ ...row, date: '2026-11-01' })) }),
    async () => ({ ok: true, json: async () => ({ unexpected: true }) })
  ];
  for (const fxFetch of cases) {
    const f = fixture({ realShell: true, fxFetch });
    await f.ready();
    assert.equal(f.ui.fx.snapshot, null);
    assert.equal(f.ui.fx.currency, 'SAR');
    assert.equal(f.ui.fx.requestCurrency('USD'), false);
    assert.equal(f.nodes['currency-select'].disabled, false);
    assert.equal(f.nodes['currency-select'].options.find(option => option.value === 'USD').disabled, true);
    f.form.requestSubmit();
    assert.equal(f.nodes.total.textContent, '13,803.25');
  }
});

test('failed refresh retains the valid snapshot, input values and results; stale data blocks new conversion', async () => {
  let fail = false;
  const f = fixture({ realShell: true, href: 'https://importos.example/?lang=en', fxFetch: async () => {
    if (fail) throw new Error('Network unavailable');
    return { ok: true, json: async () => testFxRows() };
  } });
  await f.ready();
  f.form.requestSubmit();
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  const snapshot = f.ui.fx.snapshot;
  const values = f.values();
  const result = f.nodes.total.textContent;
  fail = true;
  assert.equal(await f.ui.fx.refresh(), false);
  assert.equal(f.ui.fx.snapshot, snapshot);
  assert.equal(f.ui.fx.currency, 'USD');
  assert.deepEqual(f.values(), values);
  assert.equal(f.nodes.total.textContent, result);
  assert.match(f.nodes['currency-status'].textContent, /previous rate/);
  f.advanceTime(8 * 86400000);
  assert.equal(f.ui.fx.requestCurrency('EUR'), false);
  assert.equal(f.ui.fx.currency, 'USD');
  assert.deepEqual(f.values(), values);
  assert.match(f.nodes['currency-status'].textContent, /old/);
  assert.equal(f.ui.fx.requestCurrency('SAR'), true);
  assert.equal(f.nodes.total.textContent, '13,803.25');
});

test('refreshing rates preserves canonical SAR values and rejects a new snapshot when calculator amounts are invalid', async () => {
  let sarRate = 3.75;
  const f = fixture({ realShell: true, fxFetch: async () => ({
    ok: true, json: async () => testFxRows().map(row => row.quote === 'SAR' ? { ...row, rate: sarRate } : row)
  }) });
  await f.ready();
  f.form.requestSubmit();
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  sarRate = 3.8;
  assert.equal(await f.ui.fx.refresh(), true);
  assert.equal(f.nodes.total.textContent, '3,632.43');
  assert.equal(f.nodes['basis-warning'].hidden, true);
  assert.equal(f.ui.fx.requestCurrency('SAR'), true);
  assert.equal(f.nodes.goods.value, '10000');
  assert.equal(f.nodes.total.textContent, '13,803.25');
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  const snapshot = f.ui.fx.snapshot;
  f.input('dutyBase', '');
  const values = f.values();
  sarRate = 3.9;
  assert.equal(await f.ui.fx.refresh(), false);
  assert.equal(f.ui.fx.snapshot, snapshot);
  assert.deepEqual(f.values(), values);
});

test('concurrent refresh requests coalesce, so an older response cannot race a newer snapshot', async () => {
  let resolveResponse;
  const f = fixture({ realShell: true, fxFetch: () => new Promise(resolve => { resolveResponse = resolve; }) });
  await f.ready();
  let commits = 0;
  f.doc.addEventListener('importos:currency', () => { commits++; });
  const first = f.ui.fx.refresh();
  const second = f.ui.fx.refresh();
  assert.equal(f.requests.length, 1);
  assert.equal(f.ui.fx.requestCurrency('USD'), false);
  resolveResponse({ ok: true, json: async () => testFxRows() });
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(commits, 0, 'Initial SAR rates do not trigger an input conversion');
  assert.equal(f.requests.length, 1);
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
  commits = 0;
  const nextFirst = f.ui.fx.refresh();
  const nextSecond = f.ui.fx.refresh();
  await f.ready();
  assert.equal(f.requests.length, 2);
  resolveResponse({ ok: true, json: async () => testFxRows() });
  assert.equal(await nextFirst, true);
  assert.equal(await nextSecond, true);
  assert.equal(commits, 1, 'A foreign-currency refresh commits one consistent snapshot');
  assert.equal(f.requests.length, 2);
});

test('a deferred initial FX response leaves incomplete SAR input and its existing state untouched', async () => {
  for (const submitInvalid of [false, true]) {
    let resolveResponse;
    const f = fixture({ realShell: true, fxFetch: () => new Promise(resolve => { resolveResponse = resolve; }) });
    await f.ready();
    f.input('goods', '');
    if (submitInvalid) f.form.requestSubmit();
    await f.ready();
    const before = {
      values: f.values(), total: f.nodes.total.textContent,
      error: f.nodes.error.textContent, status: f.nodes['calc-status'].textContent,
      pending: f.nodes['basis-warning'].hidden,
      open: f.nodes.assumptions.open, focus: f.focused()
    };
    let conversions = 0;
    f.doc.addEventListener('importos:currency', () => { conversions++; });
    resolveResponse({ ok: true, json: async () => testFxRows() });
    await f.ready();
    assert.ok(f.ui.fx.snapshot);
    assert.equal(f.ui.fx.currency, 'SAR');
    assert.equal(f.nodes['currency-select'].options.find(option => option.value === 'USD').disabled, false);
    assert.equal(conversions, 0);
    assert.deepEqual({
      values: f.values(), total: f.nodes.total.textContent,
      error: f.nodes.error.textContent, status: f.nodes['calc-status'].textContent,
      pending: f.nodes['basis-warning'].hidden,
      open: f.nodes.assumptions.open, focus: f.focused()
    }, before);
  }
});

test('rate timeout releases controls and a subsequent request can recover', async () => {
  let timeoutMode = true;
  const f = fixture({ realShell: true, fxFetch: (_url, options) => {
    if (!timeoutMode) return Promise.resolve({ ok: true, json: async () => testFxRows() });
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  } });
  await f.ready();
  const timeout = [...f.timers.values()].find(timer => timer.duration === 10000);
  assert.ok(timeout, 'Request has a bounded timeout');
  timeout.callback();
  await f.ready();
  assert.equal(f.ui.fx.snapshot, null);
  assert.equal(f.nodes['currency-select'].disabled, false);
  assert.equal(f.nodes['currency-refresh'].disabled, false);
  timeoutMode = false;
  assert.equal(await f.ui.fx.refresh(), true);
  assert.ok(f.ui.fx.snapshot);
  assert.equal(f.ui.fx.requestCurrency('USD'), true);
});
