'use strict';

// Deterministic rate fixtures exercise validation and conversion only. They are
// test data, never an application fallback or a claim about current FX rates.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CURRENCIES, MAX_RATE_AGE_DAYS, normaliseSnapshot, convert, inputValue
} = require('../public/currency.js');

const now = Date.parse('2026-11-22T00:00:00Z');
const rates = { SAR: 3.75, EUR: 0.91, GBP: 0.76, CNY: 6.7, INR: 92.8, JPY: 159.3 };
const rows = (date = '2026-11-22') => Object.entries(rates).map(([quote, rate]) => ({ date, base: 'USD', quote, rate }));
const approximately = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
  `Expected ${actual} to equal ${expected} within floating-point tolerance`
);

test('supported currency metadata includes JPY zero decimals and two decimals for the other currencies', () => {
  assert.deepEqual(CURRENCIES.map(currency => currency.code).sort(), ['CNY', 'EUR', 'GBP', 'INR', 'JPY', 'SAR', 'USD']);
  for (const currency of CURRENCIES) {
    assert.equal(currency.digits, currency.code === 'JPY' ? 0 : 2);
    assert.equal(typeof currency.symbol, 'string');
  }
});

test('normalization produces an immutable complete USD-based snapshot independent of the response object', () => {
  const response = rows();
  const copy = structuredClone(response);
  const snapshot = normaliseSnapshot(response, now);
  assert.deepEqual(response, copy);
  assert.equal(snapshot.rates.USD, 1);
  assert.equal(snapshot.rates.SAR, 3.75);
  assert.equal(snapshot.receivedAt, now);
  for (const code of Object.keys(rates)) {
    assert.equal(snapshot.rates[code], rates[code]);
    assert.equal(snapshot.dates[code], '2026-11-22');
  }
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.rates), true);
  assert.equal(Object.isFrozen(snapshot.dates), true);
  response[0].rate = 100;
  assert.equal(snapshot.rates.SAR, 3.75);
});

test('incomplete or ambiguous rate responses cannot become usable snapshots', () => {
  assert.throws(() => normaliseSnapshot(rows().slice(1), now));
  assert.throws(() => normaliseSnapshot([...rows(), { ...rows()[0] }], now));
  assert.throws(() => normaliseSnapshot({}, now));
  assert.throws(() => normaliseSnapshot(null, now));
  const wrongBase = rows();
  wrongBase[0].base = 'EUR';
  assert.throws(() => normaliseSnapshot(wrongBase, now));
});

test('non-finite, zero, negative and string rates are rejected for every required quote', () => {
  for (let index = 0; index < rows().length; index++) {
    for (const rate of [0, -1, NaN, Infinity, -Infinity, '3.75', null]) {
      const response = rows();
      response[index].rate = rate;
      assert.throws(() => normaliseSnapshot(response, now), `${response[index].quote} accepted invalid rate ${rate}`);
    }
  }
});

test('date validation rejects stale, future and impossible dates while accepting the stated age boundary', () => {
  assert.equal(MAX_RATE_AGE_DAYS, 7);
  assert.doesNotThrow(() => normaliseSnapshot(rows('2026-11-15'), now));
  assert.throws(() => normaliseSnapshot(rows('2026-11-14'), now));
  assert.throws(() => normaliseSnapshot(rows('2026-11-23'), now));
  assert.throws(() => normaliseSnapshot(rows('2026-02-30'), now));
  assert.throws(() => normaliseSnapshot(rows('22/11/2026'), now));
  assert.throws(() => normaliseSnapshot(rows(''), now));
});

test('cross rates use the same canonical snapshot and preserve monetary precision before display', () => {
  const snapshot = normaliseSnapshot(rows(), now);
  assert.equal(convert(375, 'SAR', 'USD', snapshot), 100);
  assert.equal(convert(100, 'USD', 'SAR', snapshot), 375);
  approximately(convert(375, 'SAR', 'EUR', snapshot), 91);
  approximately(convert(91, 'EUR', 'GBP', snapshot), 76);
  approximately(convert(375, 'SAR', 'JPY', snapshot), 15930);
  const canonical = 13803.25;
  for (const { code } of CURRENCIES) {
    const displayed = convert(canonical, 'SAR', code, snapshot);
    approximately(convert(displayed, code, 'SAR', snapshot), canonical);
  }
  approximately(convert(0.01, 'SAR', 'USD', snapshot), 0.01 / 3.75);
});

test('unknown currencies, missing cross rates and invalid calculation values are rejected', () => {
  const snapshot = normaliseSnapshot(rows(), now);
  assert.throws(() => convert(1, 'ZZZ', 'SAR', snapshot));
  assert.throws(() => convert(1, 'SAR', 'ZZZ', snapshot));
  assert.throws(() => convert(1, 'SAR', 'USD', null));
  assert.throws(() => convert(NaN, 'SAR', 'USD', snapshot));
  assert.throws(() => convert(Infinity, 'SAR', 'USD', snapshot));
});

test('input formatting limits visible decimals while retaining nonzero tiny amounts', () => {
  const value = 1000 / 3.75;
  const text = inputValue(value);
  assert.equal(typeof text, 'string');
  assert.ok(Number.isFinite(Number(text)));
  assert.ok(Math.abs(Number(text) - value) <= 0.5e-6);
  assert.match(text, /^\d+(?:\.\d{1,6})?$/);
  assert.notEqual(text, value.toFixed(2));
  assert.equal(Number(inputValue(0)), 0);
  assert.ok(Number(inputValue(1e-12)) > 0);
  approximately(Number(inputValue(1e-12)), 1e-12);
});
