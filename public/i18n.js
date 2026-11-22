'use strict';
(() => {
  const messages = { ar: {}, en: {
    'nav.skip': 'Skip to planning tools',
    'nav.home': 'ImportOS home',
    'nav.label': 'Main navigation',
    'nav.compare': 'Compare suppliers',
    'nav.calculator': 'Shipment calculator',
    'nav.guide': 'How it works',
    'hero.eyebrow': 'FROM QUOTE TO CLEARER DECISION',
    'hero.title1': 'The price alone',
    'hero.title2': 'doesn’t tell ',
    'hero.title3': 'the whole story.',
    'hero.description': 'Compare suppliers, then estimate your shipment’s landed cost. Clear numbers in one workspace.',
    'hero.compare': 'Try the comparison',
    'hero.calculate': 'Calculate shipment cost',
    'hero.note': 'Free · No account · Your inputs stay on this page',
    'hero.visualLabel': 'Illustrative supplier comparison',
    'hero.example': 'Illustrative example',
    'hero.quantity': '1,000 units',
    'hero.delta': 'Difference in stated costs',
    'hero.deltaHint': 'Timing and missing costs complete the picture.',
    'common.currency': 'SAR',
    'common.unit': 'unit',
    'strip.compare': 'Two quotes. A clearer comparison.',
    'strip.calculate': 'Total cost and cost per unit',
    'strip.language': 'One experience in Arabic and English',
    'workspace.kicker': 'YOUR DECISION WORKSPACE',
    'workspace.title': 'Change the numbers. See the difference.',
    'workspace.description': 'Switch between comparison and calculation. Your inputs stay with you.',
    'workspace.tabs': 'Planning tools',
    'workspace.demo': 'Illustrative example · Fictional figures',
    'workspace.manual': 'Your inputs · Manually confirmed bases',
    'compare.aLetter': 'A',
    'compare.bLetter': 'B',
    'compare.supplierA': 'Supplier A',
    'compare.supplierB': 'Supplier B',
    'compare.days15': '15 days',
    'compare.days30': '30 days',
    'compare.conditions': 'ORDER CONDITIONS',
    'compare.deadline': 'When do you need the goods?',
    'compare.deadlineLabel': 'Arrival deadline',
    'compare.days20Number': '20',
    'compare.days35Number': '35',
    'compare.withinDays': 'days',
    'compare.deadlineHelp': 'Change the deadline to see which quote meets it.',
    'compare.whatIf': 'TRY ANOTHER SCENARIO',
    'compare.freightTitle': 'What if freight costs more?',
    'compare.freightHelp': 'Tap once to add the amount, and again to remove it.',
    'compare.exampleNote': '1,000 units with identical specifications. These are not real commercial quotes.',
    'compare.statedCost': 'Stated costs',
    'compare.arrival': 'Assumed arrival in',
    'compare.insight': 'COMPARISON INSIGHT',
    'compare.resultNote': 'Preliminary insight using assumed costs and dates. Confirm missing charges and supplier information before deciding.',
    'compare.exclusionsTitle': 'Unknown does not mean zero.',
    'compare.exclusions': 'This comparison excludes tax, duty, insurance and any unstated charges. Use the shipment calculator to enter these separately.',
    'compare.openCalculator': 'Open shipment calculator',
    'compare.details': 'Where do the numbers come from?',
    'compare.tableLabel': 'Supplier quote breakdown',
    'compare.caption': 'Illustrative purchase of 1,000 identical units. All amounts in Saudi riyals.',
    'compare.item': 'Item',
    'compare.unitPrice': 'Unit price',
    'compare.goodsValue': 'Goods × 1,000',
    'compare.otherFees': 'Other stated fees',
    'compare.statedTotal': 'Total stated costs',
    'compare.perPiece': 'Stated cost per unit',
    'compare.formula': 'Stated total = goods + freight + stated fees only.',
    'form.title': 'Your shipment’s landed cost, clearly.',
    'form.description': 'Start with the example, then enter the amounts and bases you have confirmed for your shipment.',
    'form.manual': 'Duty and tax bases are manual',
    'form.shipment': 'Shipment inputs',
    'form.sar': 'Amounts in Saudi riyals',
    'form.goods': 'Goods value',
    'form.units': 'Number of units',
    'form.freight': 'Freight',
    'form.insurance': 'Insurance',
    'form.other': 'Other confirmed costs',
    'form.otherHelp': 'For example, clearance and local delivery if applicable. Enter 0 when there are none.',
    'form.assumption': 'The example uses 5% duty and 15% tax. These are illustrative rates, not defaults for all shipments.',
    'form.basesTitle': 'Review duty and tax bases',
    'form.basesHelp': 'Enter and maintain these independent values after confirming them with the official authority or your broker.',
    'form.dutyBase': 'Customs duty base',
    'form.dutyRate': 'Customs duty rate %',
    'form.taxBase': 'Import tax base',
    'form.taxRate': 'Import tax rate %',
    'form.warningTitle': 'Inputs changed. Review the bases.',
    'form.review': 'Open bases for review',
    'form.confirm': 'I have reviewed the bases',
    'form.calculate': 'Calculate cost',
    'form.reset': 'Restore example',
    'result.label': 'Shipment calculation result',
    'result.title': 'ESTIMATED CASH OUTFLOW',
    'result.initial': 'Calculate to see the cost per unit.',
    'result.waiting': 'Ready to calculate',
    'result.goods': 'Goods + freight + insurance',
    'result.duty': 'Duty from your inputs',
    'result.tax': 'Tax from your inputs',
    'result.other': 'Other costs',
    'result.note': 'Includes the import tax you entered, even if it may later be recoverable. This is not a profit margin or customs declaration.',
    'result.whatIf': 'EXPLORE A FREIGHT CHANGE',
    'result.presetText': 'Another example with SAR 1,500 freight and separately updated bases.',
    'result.loadPreset': 'Load higher-freight scenario',
    'method.title': 'How is the result calculated?',
    'method.dutyTitle': 'Duty and tax',
    'method.duty': 'Each entered base × its rate ÷ 100.',
    'method.totalTitle': 'Total',
    'method.total': 'Goods + freight + insurance + duty + tax + other costs.',
    'method.unitTitle': 'Cost per unit',
    'method.unit': 'Total ÷ number of units. Display is rounded to two decimals only.',
    'method.limits': 'The calculator does not determine classifications, exemptions or official charges, or allocate mixed shipments across different products.',
    'guide.kicker': 'BEFORE YOU COMMIT',
    'guide.title': 'Three things complete the picture.',
    'guide.specTitle': 'Compare like with like',
    'guide.spec': 'Confirm specification, quantity, currency and delivery terms. Do not add freight twice if it is included in the quote.',
    'guide.basesTitle': 'Confirm bases and rates',
    'guide.bases': 'Check what applies to your product with the official authority or broker. The example is not a customs tariff.',
    'guide.zatca': 'Official ZATCA calculator',
    'guide.missingTitle': 'Ask about missing costs',
    'guide.missing': 'Clearance, inspection, storage, delivery and certificates can change the result. Check them before buying.',
    'guide.saber': 'Saber services',
    'privacy.title': 'Your inputs and the limits of this demo',
    'privacy.text': 'Inputs are used only in this page’s memory. There are no accounts, analytics, cookies or local storage. Reloading restores the examples. The hosting provider may process standard connection logs.',
    'privacy.scope': 'The comparison is an educational example and does not verify supplier quality or reliability. Both tools support planning and do not determine official charges.',
    'privacy.offer': 'The separate Excel workbook and comparison service are currently unavailable for purchase or download on this page.',
    'footer.message': 'A clearer decision. Before you order.',
    'footer.note': 'A planning tool · Results follow your inputs'
  }};

  // Keyed translations keep markup and interaction state intact.
  const bindings = [
    ['data-i18n', null],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-title', 'title'],
    ['data-i18n-placeholder', 'placeholder']
  ];
  for (const [dataAttribute, attribute] of bindings) {
    document.querySelectorAll('[' + dataAttribute + ']').forEach(element => {
      const key = element.getAttribute(dataAttribute);
      if (!(key in messages.ar)) messages.ar[key] = attribute ? element.getAttribute(attribute) || '' : element.textContent;
    });
  }
  messages.ar['common.unit'] = 'وحدة';
  messages.ar['workspace.manual'] = 'مدخلاتك · أسس تؤكّدها بنفسك';
  const formatters = new Map();
  const ui = {
    lang: new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar',
    messages,
    register(values) {
      for (const language of ['ar', 'en']) Object.assign(messages[language], values[language] || {});
    },
    t(key, parameters = {}) {
      const value = messages[ui.lang][key] ?? messages.ar[key] ?? key;
      return value.replace(/\{([\w]+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(parameters, name) ? String(parameters[name]) : match);
    },
    number(value, decimals = 0) {
      const key = ui.lang + ':' + decimals;
      if (!formatters.has(key)) formatters.set(key, new Intl.NumberFormat(ui.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
      return formatters.get(key).format(value);
    },
    money(value) {
      const amount = ui.number(value, 2);
      return ui.lang === 'ar' ? amount + ' ر.س' : 'SAR ' + amount;
    },
    apply(root = document) {
      for (const [dataAttribute, attribute] of bindings) {
        root.querySelectorAll('[' + dataAttribute + ']').forEach(element => {
          const value = ui.t(element.getAttribute(dataAttribute));
          if (attribute) element.setAttribute(attribute, value);
          else if (element.textContent !== value) element.textContent = value;
        });
      }
    },
    setLanguage(language, { updateUrl = true } = {}) {
      ui.lang = language === 'en' ? 'en' : 'ar';
      document.documentElement.lang = ui.lang;
      document.documentElement.dir = ui.lang === 'ar' ? 'rtl' : 'ltr';
      document.title = ui.lang === 'ar' ? 'ImportOS — قبل قرار الشراء' : 'ImportOS — Before you buy';
      ui.apply();
      if (updateUrl && location.protocol !== 'file:') {
        const url = new URL(location.href);
        if (ui.lang === 'en') url.searchParams.set('lang', 'en');
        else url.searchParams.delete('lang');
        history.replaceState(history.state, '', url);
      }
      document.dispatchEvent(new CustomEvent('importos:language', { detail: { language: ui.lang } }));
    }
  };
  window.ImportOS = ui;
  ui.setLanguage(ui.lang, { updateUrl: false });
})();
