'use strict';

(function () {
  const CURRENCIES = Object.freeze([
    { code: 'SAR', symbol: '', digits: 2 },
    { code: 'USD', symbol: '$', digits: 2 },
    { code: 'EUR', symbol: '€', digits: 2 },
    { code: 'GBP', symbol: '£', digits: 2 },
    { code: 'CNY', symbol: 'CN¥', digits: 2 },
    { code: 'INR', symbol: '₹', digits: 2 },
    { code: 'JPY', symbol: 'JP¥', digits: 0 }
  ].map(Object.freeze));
  const codes = CURRENCIES.map(item => item.code);
  const MAX_RATE_AGE_DAYS = 7;
  const day = 86400000;
  const ENDPOINT = 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=SAR,EUR,GBP,CNY,INR,JPY';

  function normaliseSnapshot(rows, now = Date.now()) {
    if (!Array.isArray(rows) || !Number.isFinite(now)) throw new RangeError('Invalid exchange-rate response.');
    const rates = { USD: 1 };
    const dates = {};
    const today = Math.floor(now / day) * day;
    for (const row of rows) {
      if (!row || row.base !== 'USD' || !codes.includes(row.quote) || row.quote === 'USD' || rates[row.quote] !== undefined) {
        throw new RangeError('Unexpected or duplicate exchange-rate pair.');
      }
      if (typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0) throw new RangeError('Invalid exchange rate.');
      if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new RangeError('Missing exchange-rate date.');
      const date = Date.parse(row.date + 'T00:00:00Z');
      if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== row.date || date > today || today - date > MAX_RATE_AGE_DAYS * day) {
        throw new RangeError('Exchange-rate date is invalid or too old.');
      }
      rates[row.quote] = row.rate;
      dates[row.quote] = row.date;
    }
    if (codes.some(code => !Number.isFinite(rates[code]))) throw new RangeError('Incomplete exchange-rate response.');
    return Object.freeze({ rates: Object.freeze(rates), dates: Object.freeze(dates), receivedAt: now });
  }

  function convert(amount, from, to, snapshot) {
    if (!codes.includes(from) || !codes.includes(to) || !Number.isFinite(amount)) throw new RangeError('Invalid conversion.');
    if (from === to) return amount;
    const source = snapshot?.rates[from];
    const target = snapshot?.rates[to];
    if (!Number.isFinite(source) || source <= 0 || !Number.isFinite(target) || target <= 0) throw new RangeError('Rate unavailable.');
    const result = amount * (target / source);
    if (!Number.isFinite(result) || (amount !== 0 && result === 0)) throw new RangeError('Conversion is out of range.');
    return result;
  }

  function inputValue(value) {
    if (!Number.isFinite(value)) throw new RangeError('Invalid amount.');
    const rounded = Number(value.toFixed(6));
    // The controller retains the full canonical value; this is display only.
    // Keep non-zero tiny amounts visible instead of rendering them as zero.
    return String(rounded === 0 && value !== 0 ? Number(value.toPrecision(8)) : rounded);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { CURRENCIES, MAX_RATE_AGE_DAYS, normaliseSnapshot, convert, inputValue };
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const ui = window.ImportOS;
  if (!ui) return;
  ui.register({
    ar: {
      'fx.title': 'عملتك، حسابك.',
      'fx.intro': 'اختر العملة؛ نحوّل المبالغ مباشرة في المقارنة والحاسبة.',
      'fx.select': 'عملة العرض والإدخال',
      'fx.refresh': 'تحديث أسعار الصرف',
      'fx.loading': 'جارٍ جلب أسعار الصرف…',
      'fx.ready': 'سعر مرجعي بتاريخ {date}',
      'fx.unavailable': 'تعذّر جلب سعر موثوق. حساب الريال متاح؛ حاول التحديث مجددًا.',
      'fx.retained': 'تعذّر التحديث؛ نستخدم السعر السابق بتاريخ {date}.',
      'fx.blocked': 'لم تتغيّر العملة. أكمل المبالغ الصالحة في الحاسبة ثم أعد المحاولة.',
      'fx.expired': 'السعر المحفوظ قديم. حدّث الأسعار قبل تحويل العملة.',
      'fx.note': 'سعر مرجعي للتقدير؛ قد يختلف سعر البنك وتضاف رسوم تحويل.',
      'fx.details': 'كيف يعمل التحويل؟',
      'fx.detailsText': 'تبديل العملة يحوّل جميع المبالغ مع الحفاظ على قيمتها الأساسية بالريال. تحديث الأسعار يعيد عرض هذه القيمة بالعملة المختارة. الكميات والنسب لا تتغيّر. التحويل لا يحدد الأسس أو النسب الرسمية للرسوم والضريبة.',
      'fx.precision': 'قد تظهر منازل إضافية في حقول الإدخال لحفظ قيمة التحويل؛ تُعرض النتائج بدقة العملة.',
      'fx.source': 'مصدر الأسعار: Frankfurter',
      'fx.inputs': 'المبالغ بالعملة المختارة: {currency}',
      'fx.name.SAR': 'الريال السعودي',
      'fx.name.USD': 'الدولار الأمريكي',
      'fx.name.EUR': 'اليورو',
      'fx.name.GBP': 'الجنيه الإسترليني',
      'fx.name.CNY': 'اليوان الصيني',
      'fx.name.INR': 'الروبية الهندية',
      'fx.name.JPY': 'الين الياباني'
    },
    en: {
      'fx.title': 'Your currency. Your calculation.',
      'fx.intro': 'Choose a currency. Amounts convert instantly across both tools.',
      'fx.select': 'Display and input currency',
      'fx.refresh': 'Refresh exchange rates',
      'fx.loading': 'Loading exchange rates…',
      'fx.ready': 'Reference rate dated {date}',
      'fx.unavailable': 'A reliable rate could not be loaded. SAR calculations still work; try refreshing.',
      'fx.retained': 'Refresh failed; using the previous rate dated {date}.',
      'fx.blocked': 'Currency was not changed. Complete valid calculator amounts, then try again.',
      'fx.expired': 'The saved rate is old. Refresh rates before converting.',
      'fx.note': 'An estimate using reference rates; bank rates and conversion fees may differ.',
      'fx.details': 'How does conversion work?',
      'fx.detailsText': 'Switching currency converts every amount while preserving its underlying SAR value. Refreshing rates redisplays that value in your chosen currency. Quantities and percentages stay unchanged. Conversion does not determine official duty or tax bases and rates.',
      'fx.precision': 'Inputs may show extra decimals to preserve conversion value. Results use the selected currency’s precision.',
      'fx.source': 'Exchange rates: Frankfurter',
      'fx.inputs': 'Amounts in the selected currency: {currency}',
      'fx.name.SAR': 'Saudi riyal',
      'fx.name.USD': 'US dollar',
      'fx.name.EUR': 'Euro',
      'fx.name.GBP': 'Pound sterling',
      'fx.name.CNY': 'Chinese yuan',
      'fx.name.INR': 'Indian rupee',
      'fx.name.JPY': 'Japanese yen'
    }
  });

  const select = document.getElementById('currency-select');
  const refreshButton = document.getElementById('currency-refresh');
  const status = document.getElementById('currency-status');
  const rateLine = document.getElementById('currency-rate');
  const guards = [];
  let phase = 'loading';
  let generation = 0;
  let pendingRequest = null;
  const metadata = code => CURRENCIES.find(item => item.code === code);
  const locale = () => ui.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  const makeText = value => document.createTextNode(String(value));
  function symbolContents(node, code) {
    const mark = document.createElement('span');
    mark.className = 'currency-symbol' + (code === 'SAR' ? ' currency-symbol--sar' : '');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = metadata(code).symbol;
    const name = document.createElement('span');
    name.className = 'sr-only';
    name.textContent = ui.t('fx.name.' + code) + ' ';
    node.replaceChildren(mark, name);
    node.setAttribute('title', ui.t('fx.name.' + code) + ' · ' + code);
  }
  function nativeMoney(value, code, rate = false) {
    const span = document.createElement('span');
    span.className = 'money-inline';
    span.dir = 'ltr';
    const symbol = document.createElement('span');
    symbolContents(symbol, code);
    const number = document.createElement('bdi');
    number.textContent = rate
      ? new Intl.NumberFormat(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(value)
      : ui.number(value, metadata(code).digits);
    span.append(symbol, number);
    return span;
  }
  function dateLabel(snapshot) {
    if (!snapshot) return '';
    const pair = fx.currency === 'SAR' || fx.currency === 'USD' ? ['SAR'] : ['SAR', fx.currency];
    const dates = [...new Set(pair.map(code => snapshot.dates[code]))].sort();
    const format = date => new Intl.DateTimeFormat(locale(), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
    return dates.map(format).join(' – ');
  }
  function expired(snapshot) {
    if (!snapshot) return true;
    const today = Math.floor(Date.now() / day) * day;
    return Object.values(snapshot.dates).some(date => today - Date.parse(date + 'T00:00:00Z') > MAX_RATE_AGE_DAYS * day);
  }
  function preflight(currency, snapshot) {
    try { return guards.every(guard => guard({ currency, snapshot }) !== false); }
    catch (_error) { return false; }
  }
  function announceChange(kind) {
    render();
    document.dispatchEvent(new CustomEvent('importos:currency', { detail: { currency: fx.currency, kind } }));
  }
  function render() {
    if (select) {
      for (const option of select.options) {
        const item = metadata(option.value);
        if (!item) continue;
        option.textContent = item.code + ' · ' + ui.t('fx.name.' + item.code);
        option.disabled = item.code !== 'SAR' && !fx.snapshot;
      }
      select.value = fx.currency;
      select.disabled = phase === 'loading';
    }
    if (refreshButton) refreshButton.disabled = phase === 'loading';
    document.querySelectorAll('[data-currency-symbol]').forEach(node => symbolContents(node, fx.currency));
    const selectedSymbol = document.getElementById('currency-selected-symbol');
    if (selectedSymbol) symbolContents(selectedSymbol, fx.currency);
    document.querySelectorAll('[data-money-sar]').forEach(node => fx.renderMoney(node, Number(node.dataset.moneySar)));
    const inputNote = document.getElementById('currency-input-note');
    if (inputNote) inputNote.textContent = ui.t('fx.inputs', { currency: ui.t('fx.name.' + fx.currency) + ' · ' + fx.currency });
    if (status) {
      let key = phase === 'loading' ? 'fx.loading' : phase === 'blocked' ? 'fx.blocked'
        : phase === 'expired' || (fx.snapshot && expired(fx.snapshot)) ? 'fx.expired'
        : phase === 'error' ? fx.snapshot ? 'fx.retained' : 'fx.unavailable' : 'fx.ready';
      status.textContent = ui.t(key, { date: dateLabel(fx.snapshot) });
      status.dataset.state = ['fx.unavailable', 'fx.retained', 'fx.expired', 'fx.blocked'].includes(key) ? 'warning' : phase;
    }
    if (rateLine) {
      if (!fx.snapshot) rateLine.textContent = '';
      else {
        const source = fx.currency === 'SAR' ? 'USD' : fx.currency;
        rateLine.replaceChildren(nativeMoney(1, source, true), makeText(' = '), nativeMoney(convert(1, source, 'SAR', fx.snapshot), 'SAR', true));
      }
    }
  }

  const fx = ui.fx = {
    currency: 'SAR', snapshot: null,
    fromSAR(value, currency = fx.currency, snapshot = fx.snapshot) { return convert(value, 'SAR', currency, snapshot); },
    toSAR(value) { return convert(value, fx.currency, 'SAR', fx.snapshot); },
    number(value) { return ui.number(fx.fromSAR(value), metadata(fx.currency).digits); },
    inputValue(value) { return inputValue(fx.fromSAR(value)); },
    money(value) { return { moneySAR: value }; },
    renderMoney(node, value) {
      if (node) node.replaceChildren(nativeMoney(fx.fromSAR(value), fx.currency));
    },
    renderMessage(node, key, parameters = {}) {
      if (!node) return;
      const message = ui.t(key);
      const parts = [];
      let start = 0;
      for (const match of message.matchAll(/\{([\w]+)\}/g)) {
        parts.push(makeText(message.slice(start, match.index)));
        const value = parameters[match[1]];
        parts.push(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'moneySAR')
          ? nativeMoney(fx.fromSAR(value.moneySAR), fx.currency) : makeText(value ?? match[0]));
        start = match.index + match[0].length;
      }
      parts.push(makeText(message.slice(start)));
      node.replaceChildren(...parts);
    },
    registerGuard(guard) { guards.push(guard); },
    requestCurrency(code) {
      if (!codes.includes(code) || phase === 'loading') return false;
      if (code === fx.currency) return true;
      if (code !== 'SAR' && (!fx.snapshot || expired(fx.snapshot))) {
        phase = fx.snapshot ? 'expired' : 'error'; render(); return false;
      }
      if (!preflight(code, fx.snapshot)) { phase = 'blocked'; render(); return false; }
      fx.currency = code;
      phase = fx.snapshot ? 'ready' : 'error';
      announceChange('currency');
      return true;
    },
    async refresh() {
      if (pendingRequest) return pendingRequest;
      const requestId = ++generation;
      const controller = new AbortController();
      phase = 'loading'; render();
      const timeout = setTimeout(() => controller.abort(), 10000);
      pendingRequest = (async () => {
        try {
          const response = await Promise.resolve().then(() => window.fetch(ENDPOINT, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal }));
          if (!response.ok) throw new Error('Exchange-rate request failed.');
          const snapshot = normaliseSnapshot(await response.json());
          if (requestId !== generation) return false;
          // Loading rates must not interrupt a user already typing SAR amounts.
          // Only a foreign-currency refresh can change their displayed values.
          if (fx.currency !== 'SAR' && !preflight(fx.currency, snapshot)) { phase = 'blocked'; render(); return false; }
          fx.snapshot = snapshot;
          phase = 'ready';
          if (fx.currency === 'SAR') render();
          else announceChange('rates');
          return true;
        } catch (_error) {
          if (requestId === generation) { phase = 'error'; render(); }
          return false;
        } finally { clearTimeout(timeout); if (requestId === generation) pendingRequest = null; }
      })();
      return pendingRequest;
    }
  };
  if (select) select.addEventListener('change', () => fx.requestCurrency(select.value));
  if (refreshButton) refreshButton.addEventListener('click', () => fx.refresh());
  document.addEventListener('importos:language', render);
  ui.apply();
  render();
  fx.refresh();
})();
