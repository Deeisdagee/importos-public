const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShipment, pendingBasisReview, baseline, fields } = require('../public/calculator.js');

test('reviewed baseline, unchanged bases and reviewed higher-freight scenario', () => {
  assert.deepEqual(calculateShipment(baseline), {
    subtotal: 11100, duty: 555, tax: 1748.25, total: 13803.25, extras: 400, perUnit: 138.0325
  });
  const oldBases = calculateShipment({ ...baseline, freight: 1500 });
  const newBases = calculateShipment({ ...baseline, freight: 1500, dutyBase: 11600, taxBase: 12180 });
  assert.equal(oldBases.total, 14303.25);
  assert.equal(newBases.total, 14407);
  assert.equal(newBases.duty - oldBases.duty, 25);
  assert.equal(newBases.tax - oldBases.tax, 78.75);
  assert.equal(newBases.total - oldBases.total, 103.75);
});

test('bases stay manual and the function does not change inputs', () => {
  const values = Object.freeze({ ...baseline, goods: 25000, freight: 5000, dutyBase: 321, taxBase: 654 });
  const result = calculateShipment(values);
  assert.equal(result.duty, 16.05);
  assert.equal(result.tax, 98.1);
  assert.equal(values.dutyBase, 321);
  assert.equal(values.taxBase, 654);
});

test('zero costs, zero rates and upper inclusive rates are supported', () => {
  const zero = Object.fromEntries(fields.map(id => [id, id === 'units' ? 1 : 0]));
  assert.equal(calculateShipment(zero).total, 0);
  assert.equal(calculateShipment({ ...baseline, dutyRate: 0, taxRate: 0 }).total, 11500);
  assert.equal(calculateShipment({ ...baseline, dutyRate: 100, taxRate: 100 }).total, 34255);
});

test('monetary fractions remain unrounded until formatting', () => {
  const result = calculateShipment({ ...baseline, goods: 1.001, freight: 0.002, insurance: 0.003,
    other: 0.004, dutyBase: 0.1, dutyRate: 7.5, taxBase: 0.3, taxRate: 15, units: 3 });
  assert.ok(Math.abs(result.total - 1.0625) < 1e-12);
  assert.ok(Math.abs(result.perUnit - 1.0625 / 3) < 1e-12);
});

test('unit limits are inclusive and fractional unit counts are rejected', () => {
  assert.equal(calculateShipment({ ...baseline, units: 1 }).perUnit, 13803.25);
  assert.equal(calculateShipment({ ...baseline, units: 1e9 }).perUnit, 13803.25 / 1e9);
  for (const units of [0, 0.5, 100.5, 1e9 + 1]) {
    assert.throws(() => calculateShipment({ ...baseline, units }), { code: 'calc.invalidUnits' });
  }
});

test('invalid numeric input is rejected in every field', () => {
  for (const field of fields) {
    for (const value of [-1, NaN, Infinity, -Infinity, undefined, '100']) {
      assert.throws(() => calculateShipment({ ...baseline, [field]: value }), {
        code: 'calc.invalidValue', field
      });
    }
  }
});

test('rates above 100% and arithmetic overflow are rejected', () => {
  for (const field of ['dutyRate', 'taxRate']) {
    assert.throws(() => calculateShipment({ ...baseline, [field]: 100.01 }), {
      code: 'calc.invalidRate', field
    });
  }
  assert.throws(() => calculateShipment({ ...baseline, goods: 1e308, freight: 1e308 }), { code: 'calc.tooLarge' });
  assert.throws(() => calculateShipment({ ...baseline, dutyBase: 1e308, dutyRate: 100 }), { code: 'calc.tooLarge' });
});

test('goods, freight and insurance request both manual bases', () => {
  for (const field of ['goods', 'freight', 'insurance']) {
    assert.deepEqual([...pendingBasisReview({ ...baseline, [field]: baseline[field] + 1 }, baseline)],
      ['dutyBase', 'taxBase']);
  }
});

test('duty base or rate changes request only tax base', () => {
  for (const field of ['dutyBase', 'dutyRate']) {
    assert.deepEqual([...pendingBasisReview({ ...baseline, [field]: baseline[field] + 1 }, baseline)], ['taxBase']);
  }
});

test('unrelated edits and numeric formatting do not create false warnings', () => {
  for (const field of ['units', 'other', 'taxBase', 'taxRate']) {
    assert.equal(pendingBasisReview({ ...baseline, [field]: baseline[field] + 1 }, baseline).size, 0);
  }
  assert.equal(pendingBasisReview({ ...baseline, freight: ' 1000.00 ' }, baseline).size, 0);
});

test('reverting to reviewed values clears warning, new edits re-open it', () => {
  const reviewed = { ...baseline, freight: 1500 };
  assert.equal(pendingBasisReview(reviewed, reviewed).size, 0);
  assert.equal(pendingBasisReview({ ...reviewed, freight: 1600 }, reviewed).size, 2);
  assert.equal(pendingBasisReview({ ...reviewed, freight: '1500.0' }, reviewed).size, 0);
  assert.equal(pendingBasisReview({ ...reviewed, freight: '' }, reviewed).size, 2);
});
