'use strict';

// These are the stated costs of a fictional example. Unknown charges stay excluded.
function compareScenario({ deadline = 20, extraFreight = false } = {}) {
  if (deadline !== 20 && deadline !== 35) {
    throw new RangeError('The example supports a 20- or 35-day deadline.');
  }
  if (typeof extraFreight !== 'boolean') {
    throw new TypeError('extraFreight must be a boolean.');
  }

  const quantity = 1000;
  const totalA = 12500;
  const freightB = extraFreight ? 1500 : 1000;
  const totalB = 11000 + freightB + 200;
  const arrivalA = 15;
  const arrivalB = 30;
  const onTimeA = arrivalA <= deadline;
  const onTimeB = arrivalB <= deadline;
  const winner = onTimeB && totalB < totalA ? 'B' : 'A';
  const difference = Math.abs(totalA - totalB);

  return {
    deadline, extraFreight, quantity, totalA, totalB, freightB,
    arrivalA, arrivalB, onTimeA, onTimeB, winner, difference,
    unitA: totalA / quantity,
    unitB: totalB / quantity,
    differencePerUnit: difference / quantity,
    cheaper: totalA < totalB ? 'A' : 'B'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compareScenario };
}

(function initialiseComparison() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const ui = window.ImportOS;
  if (!ui || !document.getElementById('deadline-soon')) return;

  ui.register({
    ar: {
      'cmp.unit': '{amount} / قطعة',
      'cmp.status.onTime': 'ضمن المهلة المختارة',
      'cmp.status.late': 'يتجاوز مهلة {days} يومًا',
      'cmp.freight.add': 'أضف {amount} للشحن',
      'cmp.freight.added': 'أُضيفت {amount} للشحن',
      'cmp.freight.help': 'زيادة افتراضية على شحن المورد ب. اضغط للتجربة.',
      'cmp.freight.helpAdded': 'ارتفع الشحن في المثال إلى {amount}. اضغط لإزالة الزيادة.',
      'cmp.heroDelta': 'فرق التكاليف المذكورة',
      'cmp.verdict.soon': 'المورد أ يناسب موعدك في المثال',
      'cmp.verdict.later': 'ب أوفر، وكلاهما يصل ضمن المهلة',
      'cmp.verdict.extra': 'أ أسرع وأقل تكلفة مذكورة',
      'cmp.reason.soon': 'ب أوفر بمقدار {difference}، لكنه يصل بعد 30 يومًا. مع مهلة 20 يومًا، أ هو الذي يصل في الوقت المطلوب.',
      'cmp.reason.later': 'مع مهلة 35 يومًا، العرضان يناسبان الموعد. ب أقل بمقدار {difference} في التكاليف المذكورة. أكّد البنود غير المذكورة قبل القرار.',
      'cmp.reason.extra': 'بعد زيادة الشحن، يصبح مجموع ب {totalB} مقابل {totalA} للمورد أ. أ أقل بمقدار {difference} ويصل خلال 15 يومًا.',
      'cmp.difference.A': 'أ أقل بمقدار {amount} لكل قطعة في التكاليف المذكورة.',
      'cmp.difference.B': 'ب أقل بمقدار {amount} لكل قطعة في التكاليف المذكورة.'
    },
    en: {
      'cmp.unit': '{amount} / unit',
      'cmp.status.onTime': 'Meets the selected deadline',
      'cmp.status.late': 'Misses the {days}-day deadline',
      'cmp.freight.add': 'Add {amount} to freight',
      'cmp.freight.added': '{amount} added to freight',
      'cmp.freight.help': 'An example increase to Supplier B’s freight. Tap to explore.',
      'cmp.freight.helpAdded': 'Freight in this example is now {amount}. Tap to remove the increase.',
      'cmp.heroDelta': 'Difference in stated costs',
      'cmp.verdict.soon': 'Supplier A meets your deadline in this example',
      'cmp.verdict.later': 'B costs less; both meet your deadline',
      'cmp.verdict.extra': 'A is faster and has lower stated costs',
      'cmp.reason.soon': 'B costs {difference} less, but arrives in 30 days. With a 20-day deadline, only A arrives on time.',
      'cmp.reason.later': 'With a 35-day deadline, both quotes arrive in time. B’s stated cost is {difference} lower. Confirm unstated charges before deciding.',
      'cmp.reason.extra': 'With the extra freight, B totals {totalB} versus {totalA} for A. A costs {difference} less and arrives in 15 days.',
      'cmp.difference.A': 'A’s stated cost is {amount} lower per unit.',
      'cmp.difference.B': 'B’s stated cost is {amount} lower per unit.'
    }
  });

  const state = { deadline: 20, extraFreight: false };
  const byId = id => document.getElementById(id);
  const write = (id, value) => {
    const element = byId(id);
    if (element && element.textContent !== value) element.textContent = value;
  };
  const number = (value, decimals = 0) => ui.fx ? ui.fx.number(value) : ui.number(value, decimals);
  const money = value => ui.fx ? ui.fx.money(value) : ui.money(value);
  const writeMessage = (id, key, parameters = {}) => {
    const element = byId(id);
    if (!element) return;
    if (ui.fx) ui.fx.renderMessage(element, key, parameters);
    else write(id, ui.t(key, parameters));
  };
  const pressed = (id, value) => {
    const element = byId(id);
    if (element) element.setAttribute('aria-pressed', String(value));
  };

  function renderComparison({ animate = false } = {}) {
    const result = compareScenario(state);

    pressed('deadline-soon', state.deadline === 20);
    pressed('deadline-later', state.deadline === 35);
    pressed('compare-freight', state.extraFreight);

    write('compare-total-A', number(result.totalA));
    write('compare-total-B', number(result.totalB));
    write('hero-total-A', number(result.totalA));
    write('hero-total-B', number(result.totalB));
    write('heroDelta', number(result.difference));
    write('hero-delta-label', ui.t('cmp.heroDelta'));
    writeMessage('unitA', 'cmp.unit', { amount: money(result.unitA) });
    writeMessage('unitB', 'cmp.unit', { amount: money(result.unitB) });

    ['A', 'B'].forEach(supplier => {
      const card = byId('card' + supplier);
      const status = byId('status' + supplier);
      const onTime = result['onTime' + supplier];
      if (card) card.classList.toggle('is-selected', result.winner === supplier);
      if (status) {
        status.classList.add('supplier-status');
        status.classList.toggle('is-late', !onTime);
        status.textContent = ui.t(onTime ? 'cmp.status.onTime' : 'cmp.status.late', {
          days: ui.number(result.deadline)
        });
      }
      const bar = byId('bar' + supplier);
      if (bar) bar.style.transform = 'scaleX(' + result['total' + supplier] / 12700 + ')';
    });

    writeMessage('compare-freight-label', state.extraFreight ? 'cmp.freight.added' : 'cmp.freight.add', {
      amount: money(500)
    });
    writeMessage('compare-freight-help', state.extraFreight ? 'cmp.freight.helpAdded' : 'cmp.freight.help', {
      amount: money(result.freightB)
    });

    const message = state.extraFreight ? 'extra' : state.deadline === 35 ? 'later' : 'soon';
    write('verdict', ui.t('cmp.verdict.' + message));
    writeMessage('reason', 'cmp.reason.' + message, {
      difference: money(result.difference),
      totalA: money(result.totalA),
      totalB: money(result.totalB)
    });
    writeMessage('compare-difference', 'cmp.difference.' + result.cheaper, {
      amount: money(result.differencePerUnit)
    });
    write('bFreight', number(result.freightB, 2));
    write('bSum', number(result.totalB, 2));
    write('bEach', number(result.unitB, 2));

    if (animate && typeof ui.pulse === 'function') {
      const outcome = byId('outcome');
      if (outcome) ui.pulse(outcome);
    }
  }

  byId('deadline-soon').addEventListener('click', () => {
    if (state.deadline === 20) return;
    state.deadline = 20;
    renderComparison({ animate: true });
  });
  byId('deadline-later').addEventListener('click', () => {
    if (state.deadline === 35) return;
    state.deadline = 35;
    renderComparison({ animate: true });
  });
  byId('compare-freight').addEventListener('click', () => {
    state.extraFreight = !state.extraFreight;
    renderComparison({ animate: true });
  });
  document.addEventListener('importos:language', () => renderComparison());
  document.addEventListener('importos:currency', () => renderComparison());
  if (ui.fx) ui.fx.registerGuard(({ currency, snapshot }) => {
    try { return Number.isFinite(ui.fx.fromSAR(12700, currency, snapshot)); }
    catch (_) { return false; }
  });
  ui.compareScenario = compareScenario;
  renderComparison();
})();
