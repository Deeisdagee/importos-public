'use strict';

(function () {
  const fields = Object.freeze([
    'goods', 'units', 'freight', 'insurance', 'other',
    'dutyBase', 'dutyRate', 'taxBase', 'taxRate'
  ]);
  const baseline = Object.freeze({
    goods: 10000, units: 100, freight: 1000, insurance: 100, other: 400,
    dutyBase: 11100, dutyRate: 5, taxBase: 11655, taxRate: 15
  });
  // Review dependencies are prompts, not a legal formula for customs valuation.
  // Duty and tax bases remain independent, manually entered official values.
  const basisDependencies = Object.freeze({
    goods: ['dutyBase', 'taxBase'],
    freight: ['dutyBase', 'taxBase'],
    insurance: ['dutyBase', 'taxBase'],
    dutyBase: ['taxBase'],
    dutyRate: ['taxBase']
  });

  function invalid(code, field) {
    const error = new RangeError(code);
    error.code = code;
    error.field = field || null;
    return error;
  }

  function calculateShipment(values) {
    for (const id of fields) {
      if (!values || !Number.isFinite(values[id]) || values[id] < 0) {
        throw invalid('calc.invalidValue', id);
      }
    }
    if (!Number.isInteger(values.units) || values.units < 1 || values.units > 1e9) {
      throw invalid('calc.invalidUnits', 'units');
    }
    if (values.dutyRate > 100 || values.taxRate > 100) {
      throw invalid('calc.invalidRate', values.dutyRate > 100 ? 'dutyRate' : 'taxRate');
    }
    // Keep the reviewed arithmetic and defer rounding until display.
    const subtotal = values.goods + values.freight + values.insurance;
    const duty = values.dutyBase * values.dutyRate / 100;
    const tax = values.taxBase * values.taxRate / 100;
    const total = subtotal + duty + tax + values.other;
    const perUnit = total / values.units;
    if (![subtotal, duty, tax, total, perUnit].every(Number.isFinite)) {
      throw invalid('calc.tooLarge');
    }
    return { subtotal, duty, tax, total, extras: values.other, perUnit };
  }

  function pendingBasisReview(current, reviewed) {
    const pending = new Set();
    for (const [source, affected] of Object.entries(basisDependencies)) {
      const value = String(current[source] ?? '').trim();
      const previous = String(reviewed[source] ?? '').trim();
      if (value === '' || Number(value) !== Number(previous)) {
        for (const id of affected) pending.add(id);
      }
    }
    return pending;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateShipment, pendingBasisReview, baseline, fields };
  }
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const UI = window.ImportOS;
  const form = document.getElementById('shipment-form');
  if (!UI || !form) return;
  UI.calculateShipment = calculateShipment;
  UI.register({
    ar: {
      'calc.warningTitle': 'راجع أسس الرسوم والضريبة',
      'calc.warningBoth': 'تغيّرت أرقام قد تؤثر في أساس الرسم الجمركي وأساس ضريبة الاستيراد. القيم يدوية ولا تتحدث تلقائيًا؛ راجعها مع الجهة الرسمية أو المخلّص، ثم أكّد مراجعتك.',
      'calc.warningDuty': 'تغيّرت أرقام قد تؤثر في أساس الرسم الجمركي. القيمة يدوية؛ راجعها مع الجهة الرسمية أو المخلّص، ثم أكّد مراجعتك.',
      'calc.warningTax': 'تغيّر أساس الرسم أو نسبته؛ قد يحتاج أساس ضريبة الاستيراد إلى مراجعة. لا يتحدث تلقائيًا. راجعه مع الجهة الرسمية أو المخلّص، ثم أكّد مراجعتك.',
      'calc.reviewButton': 'فتح الأسس للمراجعة',
      'calc.confirmButton': 'أؤكد مراجعة الأسس',
      'calc.provisional': 'تقدير مبدئي: استُخدمت الأسس المدخلة كما هي، وقد تحتاج إلى مراجعة قبل الاعتماد.',
      'calc.waiting': 'اضغط «احسب التكلفة» لعرض تكلفة الوحدة.',
      'calc.edited': 'تغيّرت المدخلات. اضغط «احسب التكلفة» لتحديث النتيجة.',
      'calc.perUnit': '{amount} للوحدة',
      'calc.statusWaiting': 'جاهز للحساب',
      'calc.statusEdited': 'بانتظار إعادة الحساب',
      'calc.statusCalculated': 'حسب مدخلاتك',
      'calc.statusProvisional': 'الأسس تحتاج مراجعة',
      'calc.invalid': 'راجع الحقول: أكملها بأرقام غير سالبة، وعدد وحدات صحيح بين 1 و1,000,000,000، ونسب لا تتجاوز 100٪.',
      'calc.required': 'أكمل جميع الحقول. أدخل 0 للمبلغ الذي لا ينطبق.',
      'calc.invalidValue': 'استخدم أرقامًا صالحة غير سالبة في جميع الحقول. أدخل 0 للمبلغ الذي لا ينطبق.',
      'calc.invalidUnits': 'أدخل عدد وحدات صحيحًا بين 1 و1,000,000,000.',
      'calc.invalidRate': 'يجب أن تكون نسبة الرسم ونسبة الضريبة بين 0٪ و100٪.',
      'calc.currencyInvalid': 'أكمل المبالغ بأرقام صالحة غير سالبة قبل تغيير العملة. بقيت العملة والمبالغ كما هي.',
      'calc.tooLarge': 'الأرقام كبيرة جدًا للحساب؛ راجع المبالغ المدخلة.'
    },
    en: {
      'calc.warningTitle': 'Review the duty and tax bases',
      'calc.warningBoth': 'Some changes may affect the customs-duty and import-tax bases. These values are manual and do not update automatically. Confirm them with the official authority or your broker, then acknowledge your review.',
      'calc.warningDuty': 'Some changes may affect the customs-duty base. This value is manual. Confirm it with the official authority or your broker, then acknowledge your review.',
      'calc.warningTax': 'The duty base or rate changed, so the import-tax base may need a review. It does not update automatically. Confirm it with the official authority or your broker, then acknowledge your review.',
      'calc.reviewButton': 'Open bases for review',
      'calc.confirmButton': 'I have reviewed the bases',
      'calc.provisional': 'Provisional estimate: the entered bases were used unchanged and may need review before you rely on the result.',
      'calc.waiting': 'Select “Calculate cost” to see the cost per unit.',
      'calc.edited': 'Your inputs changed. Select “Calculate cost” to update the result.',
      'calc.perUnit': '{amount} per unit',
      'calc.statusWaiting': 'Ready to calculate',
      'calc.statusEdited': 'Recalculate to update',
      'calc.statusCalculated': 'Based on your inputs',
      'calc.statusProvisional': 'Bases need review',
      'calc.invalid': 'Check the fields: complete them with non-negative numbers, a whole unit count from 1 to 1,000,000,000, and rates no higher than 100%.',
      'calc.required': 'Complete every field. Enter 0 for a cost that does not apply.',
      'calc.invalidValue': 'Use valid, non-negative numbers in every field. Enter 0 for a cost that does not apply.',
      'calc.invalidUnits': 'Enter a whole unit count from 1 to 1,000,000,000.',
      'calc.invalidRate': 'Both the duty rate and the tax rate must be between 0% and 100%.',
      'calc.currencyInvalid': 'Complete the amounts with valid, non-negative numbers before changing currency. Your currency and amounts have stayed unchanged.',
      'calc.tooLarge': 'These amounts are too large to calculate. Review the entered values.'
    }
  });

  const inputs = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  const assumptions = form.querySelector('details.assumptions');
  const warning = document.getElementById('basis-warning');
  const warningText = document.getElementById('basis-warning-text');
  const confirmButton = document.getElementById('confirm-bases');
  const resultWarning = document.getElementById('result-basis-warning');
  const errorElement = document.getElementById('error');
  const status = document.getElementById('calc-status');
  const resultPanel = document.getElementById('estimate');
  const outputIds = ['total', 'subtotal', 'duty', 'tax', 'extras'];
  const monetaryFields = ['goods', 'freight', 'insurance', 'other', 'dutyBase', 'taxBase'];
  // Currency changes only render these SAR values; they never reparse rounded
  // display amounts. User edits are converted to SAR once, at the active rate.
  const moneyValues = Object.fromEntries(monetaryFields.map(id => [id, Number(inputs[id].value)]));
  const displayedInputs = Object.fromEntries(monetaryFields.map(id => [id, inputs[id].value.trim()]));
  let currentResult = null;
  let phase = 'waiting';
  let errorKey = '';
  let errorField = null;
  let focusQueued = false;

  const captureSources = () => Object.fromEntries(
    Object.keys(basisDependencies).map(id => [id,
      monetaryFields.includes(id) && Number.isFinite(moneyValues[id])
        ? moneyValues[id] : inputs[id].value.trim()
    ])
  );
  let reviewedSources = captureSources();
  const pendingBases = () => pendingBasisReview(captureSources(), reviewedSources);

  function syncMonetaryInput(id) {
    const raw = inputs[id].value.trim();
    const displayed = displayedInputs[id];
    const value = Number(raw);
    const unchanged = raw !== '' && displayed !== '' && Number.isFinite(value)
      && value === Number(displayed);
    if (!unchanged) {
      if (raw === '' || !Number.isFinite(value) || value < 0) moneyValues[id] = NaN;
      else {
        try { moneyValues[id] = UI.fx ? UI.fx.toSAR(value) : value; }
        catch (_) { moneyValues[id] = NaN; }
      }
    }
    displayedInputs[id] = raw;
  }

  function renderMonetaryInputs() {
    for (const id of monetaryFields) {
      if (!Number.isFinite(moneyValues[id])) continue;
      inputs[id].value = UI.fx ? UI.fx.inputValue(moneyValues[id]) : String(moneyValues[id]);
      displayedInputs[id] = inputs[id].value.trim();
    }
  }

  const money = value => UI.fx ? UI.fx.money(value) : UI.money(value);
  function renderMessage(node, key, parameters = {}) {
    if (!node) return;
    if (UI.fx) UI.fx.renderMessage(node, key, parameters);
    else node.textContent = UI.t(key, parameters);
  }

  function focusInvalid(field) {
    const target = (field && inputs[field]) || form.querySelector('input:invalid');
    if (!target) return;
    if (assumptions.contains(target)) assumptions.open = true;
    target.focus();
  }

  function render() {
    const pending = pendingBases();
    for (const id of outputIds) {
      document.getElementById(id).textContent = currentResult
        ? UI.fx ? UI.fx.number(currentResult[id]) : UI.number(currentResult[id], 2)
        : '—';
    }
    renderMessage(document.getElementById('perUnit'), currentResult
      ? 'calc.perUnit' : phase === 'waiting' ? 'calc.waiting' : 'calc.edited',
    currentResult ? { amount: money(currentResult.perUnit) } : {});
    renderMessage(document.getElementById('calculator-preset-description'), 'result.presetText', {
      amount: money(1500)
    });

    warning.hidden = pending.size === 0;
    if (pending.size > 0) {
      const key = pending.size > 1 ? 'calc.warningBoth'
        : pending.has('dutyBase') ? 'calc.warningDuty' : 'calc.warningTax';
      // Avoid needless live-region updates while the user types.
      const message = UI.t(key);
      if (warningText.textContent !== message) warningText.textContent = message;
    }
    confirmButton.disabled = !assumptions.open;
    resultWarning.textContent = UI.t('calc.provisional');
    resultWarning.hidden = !currentResult || pending.size === 0;
    errorElement.textContent = errorKey ? UI.t(errorKey) : '';

    for (const id of fields) {
      const invalidField = errorKey && (id === errorField || !inputs[id].validity.valid);
      if (invalidField) inputs[id].setAttribute('aria-invalid', 'true');
      else inputs[id].removeAttribute('aria-invalid');
    }

    const state = currentResult ? (pending.size ? 'provisional' : 'calculated') : phase;
    if (status) {
      const key = currentResult
        ? pending.size ? 'calc.statusProvisional' : 'calc.statusCalculated'
        : phase === 'waiting' ? 'calc.statusWaiting' : 'calc.statusEdited';
      status.textContent = UI.t(key);
      status.dataset.state = state;
    }
    if (resultPanel) resultPanel.dataset.state = state;
  }

  function clearResult() {
    currentResult = null;
    phase = 'edited';
  }

  function loadPreset(values) {
    for (const id of fields) {
      if (monetaryFields.includes(id)) moneyValues[id] = values[id];
      else inputs[id].value = values[id];
    }
    renderMonetaryInputs();
    reviewedSources = captureSources();
    errorKey = '';
    errorField = null;
    form.requestSubmit();
  }

  assumptions.addEventListener('toggle', render);
  document.getElementById('review-bases').addEventListener('click', () => {
    assumptions.open = true;
    inputs[pendingBases().has('dutyBase') ? 'dutyBase' : 'taxBase'].focus();
  });
  confirmButton.addEventListener('click', () => {
    if (!assumptions.open || !form.checkValidity()) return;
    reviewedSources = captureSources();
    errorKey = '';
    errorField = null;
    render();
  });
  form.addEventListener('input', event => {
    if (!fields.includes(event.target.id)) return;
    if (monetaryFields.includes(event.target.id)) syncMonetaryInput(event.target.id);
    clearResult();
    errorKey = '';
    errorField = null;
    render();
  });
  form.addEventListener('invalid', event => {
    event.preventDefault();
    clearResult();
    errorKey = 'calc.invalid';
    errorField = null;
    if (assumptions.contains(event.target)) assumptions.open = true;
    render();
    if (!focusQueued) {
      focusQueued = true;
      queueMicrotask(() => {
        focusQueued = false;
        focusInvalid();
      });
    }
  }, true);
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearResult();
    errorKey = '';
    errorField = null;
    try {
      const values = {};
      for (const id of fields) {
        const raw = inputs[id].value.trim();
        if (raw === '') throw invalid('calc.required', id);
        if (monetaryFields.includes(id)) {
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0) throw invalid('calc.invalidValue', id);
          syncMonetaryInput(id);
          if (!Number.isFinite(moneyValues[id])) throw invalid('calc.tooLarge', id);
          values[id] = moneyValues[id];
        } else values[id] = Number(raw);
      }
      currentResult = calculateShipment(values);
      render();
      if (typeof UI.pulse === 'function' && resultPanel) UI.pulse(resultPanel);
    } catch (error) {
      errorKey = error.code || 'calc.invalid';
      errorField = error.field || null;
      render();
      focusInvalid(errorField);
    }
  });

  document.getElementById('baseline').addEventListener('click', () => loadPreset(baseline));
  document.getElementById('higher-freight').addEventListener('click', () => loadPreset({
    ...baseline, freight: 1500, dutyBase: 11600, taxBase: 12180
  }));
  const tryExample = document.getElementById('try-example');
  if (tryExample) tryExample.addEventListener('click', () => loadPreset(baseline));
  if (UI.fx) {
    UI.fx.registerGuard(({ currency, snapshot }) => {
      for (const id of monetaryFields) {
        const raw = inputs[id].value.trim();
        if (raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0 || !inputs[id].validity.valid) {
          errorKey = 'calc.currencyInvalid';
          errorField = id;
          render();
          focusInvalid(id);
          return false;
        }
        syncMonetaryInput(id);
        try {
          if (!Number.isFinite(moneyValues[id]) || !Number.isFinite(UI.fx.fromSAR(moneyValues[id], currency, snapshot))) {
            throw invalid('calc.tooLarge', id);
          }
        } catch (_) {
          errorKey = 'calc.tooLarge';
          errorField = id;
          render();
          focusInvalid(id);
          return false;
        }
      }
      if (currentResult) {
        try {
          if (Object.values(currentResult).some(value => !Number.isFinite(UI.fx.fromSAR(value, currency, snapshot)))) {
            throw invalid('calc.tooLarge');
          }
        } catch (_) {
          errorKey = 'calc.tooLarge';
          errorField = null;
          render();
          return false;
        }
      }
      return true;
    });
  }
  document.addEventListener('importos:currency', () => {
    renderMonetaryInputs();
    render();
  });
  document.addEventListener('importos:language', render);
  UI.apply(document);
  render();
})();
