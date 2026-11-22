'use strict';
(() => {
  const ui = window.ImportOS;
  const panels = { compare: document.getElementById('compare-panel'), calculator: document.getElementById('calculator-panel') };
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const languageButton = document.getElementById('language-toggle');
  const languageLabel = document.getElementById('language-label');
  const badge = document.getElementById('workspace-badge');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentView = 'compare';
  const animationTimers = new WeakMap();

  ui.pulse = element => {
    if (!element || reducedMotion.matches) return;
    clearTimeout(animationTimers.get(element));
    element.classList.remove('result-updated');
    void element.offsetWidth;
    element.classList.add('result-updated');
    animationTimers.set(element, setTimeout(() => element.classList.remove('result-updated'), 400));
  };
  function refreshLanguageControl() {
    const isArabic = ui.lang === 'ar';
    languageLabel.textContent = isArabic ? 'EN' : 'العربية';
    languageLabel.lang = isArabic ? 'en' : 'ar';
    languageButton.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
    badge.textContent = ui.t(currentView === 'compare' ? 'workspace.demo' : 'workspace.manual');
  }
  function viewFromLocation() {
    return ['#calculator', '#estimate', '#example'].includes(location.hash) ? 'calculator' : 'compare';
  }
  function selectView(view, { scroll = false, focus = false, updateUrl = false, animate = true } = {}) {
    if (!panels[view]) return;
    const changed = currentView !== view;
    currentView = view;
    for (const [name, panel] of Object.entries(panels)) {
      const active = name === view;
      panel.hidden = !active;
      panel.classList.remove('panel-enter');
      if (active && changed && animate && !reducedMotion.matches) panel.classList.add('panel-enter');
    }
    tabs.forEach(tab => {
      const active = tab.dataset.tab === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('is-active', active);
      if (active && focus) tab.focus({ preventScroll: true });
    });
    document.querySelectorAll('[data-nav]').forEach(link => {
      const active = link.dataset.nav === view;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    refreshLanguageControl();
    if (updateUrl && location.protocol !== 'file:' && location.hash !== '#' + view) {
      const url = new URL(location.href);
      url.hash = view;
      history.pushState({ view }, '', url);
    }
    if (scroll) document.getElementById('workspace').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }
  tabs.forEach(tab => {
    tab.addEventListener('click', () => selectView(tab.dataset.tab, { updateUrl: true }));
    tab.addEventListener('keydown', event => {
      const isRtl = document.documentElement.dir === 'rtl';
      let index = tabs.indexOf(tab);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else if (event.key === 'ArrowRight') index += isRtl ? -1 : 1;
      else if (event.key === 'ArrowLeft') index += isRtl ? 1 : -1;
      else return;
      event.preventDefault();
      index = (index + tabs.length) % tabs.length;
      selectView(tabs[index].dataset.tab, { focus: true, updateUrl: true });
    });
  });
  document.querySelectorAll('[data-go]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      selectView(link.dataset.go, { scroll: true, focus: true, updateUrl: true });
    });
  });
  languageButton.addEventListener('click', () => ui.setLanguage(ui.lang === 'ar' ? 'en' : 'ar'));
  document.addEventListener('importos:language', refreshLanguageControl);
  window.addEventListener('popstate', () => {
    const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar';
    if (ui.lang !== language) ui.setLanguage(language, { updateUrl: false });
    selectView(viewFromLocation(), { animate: false });
  });
  window.addEventListener('hashchange', () => {
    if (['#compare', '#calculator', '#estimate', '#example'].includes(location.hash)) selectView(viewFromLocation(), { animate: false });
  });
  selectView(viewFromLocation(), { animate: false });
})();
