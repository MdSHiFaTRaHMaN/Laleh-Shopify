if (!customElements.get("m-localization-form")) {
  class MLocalizationForm extends HTMLElement {
    constructor() {
      super();
      const select = this.querySelector('[data-localization-select]');
      select && select.addEventListener('change', (e) => {
        const value = (e.target.value || '').toUpperCase();
        const selectedOpt = select.options && select.options[select.selectedIndex];
        const optCurrency = selectedOpt ? selectedOpt.getAttribute('data-currency') : null;
        const form = select.closest('[data-localization-form]');
        const input = form ? form.querySelector('input[data-localization-input]') : null;
        if (input) input.value = value;

        const isCountry = select.name === 'country_code' || (input && input.name === 'country_code');
        if (isCountry) {
          const marketData = window.MinimogSettings && window.MinimogSettings.market_countries && window.MinimogSettings.market_countries[value];
          const finalCurr = (marketData && marketData.currency) || optCurrency || (window.CurrencyEngine && window.CurrencyEngine.countryMap && window.CurrencyEngine.countryMap[value]) || 'USD';
          try {
            localStorage.setItem('m_active_country', value);
            localStorage.setItem('m_active_currency', finalCurr);
          } catch (err) {}
          if (window.CurrencyEngine && typeof window.CurrencyEngine.setCurrency === 'function') {
            window.CurrencyEngine.setCurrency(finalCurr, value);
          }
          if (form) {
            form.submit();
          }
        } else {
          // Language / other localization changes submit normally
          input && form && form.submit();
        }
      });
    }
  }
  customElements.define('m-localization-form', MLocalizationForm);
}