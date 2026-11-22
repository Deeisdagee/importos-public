'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareScenario } = require('../public/compare.js');

test('20-day deadline favors A while B has SAR 300 lower stated costs', () => {
  const r = compareScenario();
  assert.equal(r.totalA, 12500);
  assert.equal(r.totalB, 12200);
  assert.equal(r.winner, 'A');
  assert.equal(r.onTimeA, true);
  assert.equal(r.onTimeB, false);
  assert.equal(r.cheaper, 'B');
  assert.equal(r.difference, 300);
  assert.equal(r.unitA, 12.5);
  assert.equal(r.unitB, 12.2);
  assert.equal(r.differencePerUnit, 0.3);
});

test('35-day deadline favors B and both suppliers arrive in time', () => {
  const r = compareScenario({ deadline: 35 });
  assert.equal(r.winner, 'B');
  assert.equal(r.onTimeA, true);
  assert.equal(r.onTimeB, true);
  assert.equal(r.totalB, 12200);
  assert.equal(r.freightB, 1000);
});

for (const deadline of [20, 35]) {
  test(`extra freight makes A SAR 200 cheaper with a ${deadline}-day deadline`, () => {
    const r = compareScenario({ deadline, extraFreight: true });
    assert.equal(r.winner, 'A');
    assert.equal(r.totalB, 12700);
    assert.equal(r.freightB, 1500);
    assert.equal(r.unitB, 12.7);
    assert.equal(r.difference, 200);
    assert.equal(r.differencePerUnit, 0.2);
    assert.equal(r.cheaper, 'A');
    assert.equal(r.onTimeB, deadline === 35);
  });
}

test('reverting freight and deadline restores the exact original example', () => {
  const state = { deadline: 20, extraFreight: false };
  const initial = compareScenario(state);
  state.deadline = 35;
  state.extraFreight = true;
  compareScenario(state);
  state.deadline = 20;
  state.extraFreight = false;
  assert.deepEqual(compareScenario(state), initial);
});

test('input state is never mutated and unsupported settings are rejected', () => {
  const settings = Object.freeze({ deadline: 35, extraFreight: true });
  assert.equal(compareScenario(settings).winner, 'A');
  assert.throws(() => compareScenario({ deadline: 0 }), RangeError);
  assert.throws(() => compareScenario({ deadline: '35' }), RangeError);
  assert.throws(() => compareScenario({ extraFreight: 'false' }), TypeError);
});
