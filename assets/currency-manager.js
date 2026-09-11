/**
 * Dynamic Storefront Currency & Country Localization Engine
 * Automatically synchronizes Popup, Megamenu, Header, and Footer currency/country selectors
 * and dynamically updates all product card prices, compare-at prices, sale badges, and totals sitewide.
 */

(function () {
  'use strict';

  const CURRENCY_STORAGE_KEY = 'm_active_currency';
  const COUNTRY_STORAGE_KEY = 'm_active_country';

  // Comprehensive Currency Table with Rates, Symbols & Formats (Base: USD = 1.0)
  const CURRENCIES = {
    USD: { code: 'USD', name: 'US Dollar', symbol: '$', format: '$ {{amount}}', rate: 1.0, precision: 2 },
    EUR: { code: 'EUR', name: 'Euro', symbol: '€', format: '€ {{amount}}', rate: 0.92, precision: 2 },
    GBP: { code: 'GBP', name: 'British Pound', symbol: '£', format: '£ {{amount}}', rate: 0.79, precision: 2 },
    CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', format: 'CHF {{amount}}', rate: 0.88, precision: 2 },
    CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', format: 'CA$ {{amount}}', rate: 1.36, precision: 2 },
    AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', format: 'A$ {{amount}}', rate: 1.53, precision: 2 },
    JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', format: '¥ {{amount_no_decimals}}', rate: 155.0, precision: 0 },
    BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', format: '৳ {{amount}}', rate: 120.0, precision: 2 },
    INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', format: '₹ {{amount}}', rate: 83.5, precision: 2 },
    AED: { code: 'AED', name: 'UAE Dirham', symbol: 'Dhs', format: 'Dhs {{amount}}', rate: 3.67, precision: 2 },
    SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', format: 'SAR {{amount}}', rate: 3.75, precision: 2 },
    QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', format: 'QAR {{amount}}', rate: 3.64, precision: 2 },
    KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', format: 'KWD {{amount}}', rate: 0.31, precision: 2 },
    SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', format: 'S$ {{amount}}', rate: 1.35, precision: 2 },
    NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', format: 'NZ$ {{amount}}', rate: 1.65, precision: 2 },
    HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', format: 'HK$ {{amount}}', rate: 7.82, precision: 2 },
    SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', format: 'kr {{amount}}', rate: 10.50, precision: 2 },
    NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', format: 'kr {{amount}}', rate: 10.80, precision: 2 },
    DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', format: 'kr {{amount}}', rate: 6.90, precision: 2 },
    KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', format: '₩ {{amount_no_decimals}}', rate: 1380.0, precision: 0 },
    CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', format: '¥ {{amount}}', rate: 7.23, precision: 2 },
    BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', format: 'R$ {{amount}}', rate: 5.40, precision: 2 },
    MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', format: 'Mex$ {{amount}}', rate: 18.20, precision: 2 },
    TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', format: '₺ {{amount}}', rate: 33.0, precision: 2 },
    ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', format: 'R {{amount}}', rate: 18.20, precision: 2 },
    PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', format: 'zł {{amount}}', rate: 3.95, precision: 2 }
  };

  // Map Country Code to Default Currency
  const COUNTRY_CURRENCY_MAP = {
    US: 'USD',
    CH: 'CHF',
    GB: 'GBP',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    IE: 'EUR',
    PT: 'EUR',
    GR: 'EUR',
    FI: 'EUR',
    LU: 'EUR',
    CY: 'EUR',
    MT: 'EUR',
    SK: 'EUR',
    SI: 'EUR',
    EE: 'EUR',
    LV: 'EUR',
    LT: 'EUR',
    AL: 'EUR',
    AD: 'EUR',
    MC: 'EUR',
    ME: 'EUR',
    JP: 'JPY',
    BD: 'BDT',
    IN: 'INR',
    AE: 'AED',
    SA: 'SAR',
    QA: 'QAR',
    KW: 'KWD',
    CA: 'CAD',
    AU: 'AUD',
    NZ: 'NZD',
    SG: 'SGD',
    HK: 'HKD',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    KR: 'KRW',
    CN: 'CNY',
    BR: 'BRL',
    MX: 'MXN',
    TR: 'TRY',
    ZA: 'ZAR',
    PL: 'PLN'
  };

  // Country Names
  const COUNTRY_NAMES = {
    CH: 'Switzerland',
    US: 'United States',
    GB: 'United Kingdom',
    FR: 'France',
    DE: 'Germany',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    BE: 'Belgium',
    AT: 'Austria',
    IE: 'Ireland',
    PT: 'Portugal',
    GR: 'Greece',
    FI: 'Finland',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    LU: 'Luxembourg',
    PL: 'Poland',
    CA: 'Canada',
    AU: 'Australia',
    NZ: 'New Zealand',
    JP: 'Japan',
    SG: 'Singapore',
    HK: 'Hong Kong',
    KR: 'South Korea',
    CN: 'China',
    BD: 'Bangladesh',
    IN: 'India',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    KW: 'Kuwait',
    OM: 'Oman',
    BH: 'Bahrain',
    TR: 'Turkey',
    BR: 'Brazil',
    MX: 'Mexico',
    ZA: 'South Africa'
  };

  function getCountryName(countryCode) {
    if (!countryCode) {
      return (window.MinimogSettings && window.MinimogSettings.country_name) || 'Switzerland';
    }
    const code = countryCode.toUpperCase();
    if (COUNTRY_NAMES[code]) return COUNTRY_NAMES[code];
    try {
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        const dn = new Intl.DisplayNames(['en'], { type: 'region' });
        const name = dn.of(code);
        if (name) return name;
      }
    } catch (e) {}
    return code;
  }

  function getBaseCurrency() {
    return (window.MinimogSettings && window.MinimogSettings.currency_code) || 'USD';
  }

  function getActiveCurrency() {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch (e) {}
    return getBaseCurrency();
  }

  function getActiveCountry() {
    try {
      const saved = localStorage.getItem(COUNTRY_STORAGE_KEY);
      if (saved) return saved.toUpperCase();
    } catch (e) {}
    if (window.MinimogSettings && window.MinimogSettings.country_code) {
      return window.MinimogSettings.country_code.toUpperCase();
    }
    if (window.Shopify && window.Shopify.country) {
      return window.Shopify.country.toUpperCase();
    }
    return 'CH';
  }

  function formatMoneyValue(cents, targetCurrencyCode) {
    const curr = CURRENCIES[targetCurrencyCode] || CURRENCIES.USD;
    const baseCode = getBaseCurrency();
    const baseRate = (CURRENCIES[baseCode] && CURRENCIES[baseCode].rate) || 1.0;
    const targetRate = curr.rate || 1.0;

    // Convert from base currency to target currency
    const rateMultiplier = targetRate / baseRate;
    const convertedCents = Math.round(cents * rateMultiplier);
    const precision = curr.precision !== undefined ? curr.precision : 2;

    const val = (convertedCents / 100.0).toFixed(precision);
    const parts = val.split('.');
    const integerPart = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
    const decimalPart = parts[1] ? '.' + parts[1] : '';
    const formattedAmount = integerPart + (precision > 0 ? decimalPart : '');

    let formatStr = curr.format;
    if (precision === 0) {
      formatStr = formatStr.replace(/\{\{\s*amount\s*\}\}/g, '{{amount_no_decimals}}');
    }

    return formatStr
      .replace(/\{\{\s*amount\s*\}\}/g, formattedAmount)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, integerPart);
  }

  function parsePriceToCents(el) {
    // 1. Check data-base-price or data-amount or data-price attribute
    if (el.hasAttribute('data-base-price')) {
      const val = parseFloat(el.getAttribute('data-base-price'));
      if (!isNaN(val)) return val;
    }
    if (el.hasAttribute('data-amount')) {
      const val = parseFloat(el.getAttribute('data-amount'));
      if (!isNaN(val)) {
        el.setAttribute('data-base-price', val);
        return val;
      }
    }
    if (el.hasAttribute('data-price')) {
      const val = parseFloat(el.getAttribute('data-price'));
      if (!isNaN(val)) {
        el.setAttribute('data-base-price', val);
        return val;
      }
    }

    // 2. Parse numbers from textContent
    const text = el.textContent.replace(/[^0-9.,]/g, '').trim();
    if (!text) return null;

    let num = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(num)) {
      // If it looks like raw dollars e.g. 19.99
      if (text.includes('.') && num < 100000) {
        const cents = Math.round(num * 100);
        el.setAttribute('data-base-price', cents);
        return cents;
      } else {
        // If it was already in cents or large amount
        const cents = Math.round(num);
        el.setAttribute('data-base-price', cents);
        return cents;
      }
    }
    return null;
  }

  function updateProductCardPrices(targetCurrency) {
    const targetCurr = CURRENCIES[targetCurrency] || CURRENCIES.USD;

    // 1. Update all .m-price containers and their child price items
    const priceElements = document.querySelectorAll('.m-price, .m-product-card__price, .m-cascading-product-card__price, .m-right-drawer-item__price');
    priceElements.forEach(function (container) {
      // Find regular, sale, and compare prices
      const regItems = container.querySelectorAll('.m-price-item--regular:not(s), .m-price-item--sale, [data-price]');
      regItems.forEach(function (item) {
        const cents = parsePriceToCents(item);
        if (cents != null && cents > 0) {
          item.textContent = formatMoneyValue(cents, targetCurrency);
        }
      });

      const compareItems = container.querySelectorAll('s.m-price-item--regular, .m-right-price-compare, [data-compare-price]');
      compareItems.forEach(function (item) {
        const cents = parsePriceToCents(item);
        if (cents != null && cents > 0) {
          item.textContent = formatMoneyValue(cents, targetCurrency);
        }
      });
    });

    // 2. Update standalone .m-price-item
    const standaloneItems = document.querySelectorAll('.m-price-item, .m-right-price, [data-amount]');
    standaloneItems.forEach(function (item) {
      if (!item.closest('.m-price')) {
        const cents = parsePriceToCents(item);
        if (cents != null && cents > 0) {
          item.textContent = formatMoneyValue(cents, targetCurrency);
        }
      }
    });

    // 3. Update MinimogSettings for theme JS compatibility
    if (window.MinimogSettings) {
      window.MinimogSettings.currency_code = targetCurr.code;
      window.MinimogSettings.money_format = targetCurr.format;
    }
  }

  function syncAllSelectors(currencyCode, countryCode) {
    // 1. Update Megamenu / Mobile Menu Selectors
    const customSelects = document.querySelectorAll('m-select-component');
    customSelects.forEach(function (component) {
      const nativeSelect = component.querySelector('.js-selectNative');
      if (nativeSelect) {
        const matchingOption = nativeSelect.querySelector(`option[value="${currencyCode}"], option[value="${countryCode}"]`);
        if (matchingOption) {
          nativeSelect.value = matchingOption.value;
          const triggerText = component.querySelector('.m-select-custom--trigger-text');
          if (triggerText) triggerText.textContent = matchingOption.text || matchingOption.value;
          const optList = component.querySelectorAll('.m-select-custom--option');
          optList.forEach(function (opt) {
            if (opt.getAttribute('data-value') === matchingOption.value) {
              opt.classList.add('isActive');
            } else {
              opt.classList.remove('isActive');
            }
          });
        }
      }
    });

    // 2. Update Custom Footer Country/Currency Trigger
    const footerTriggerLabel = document.querySelector('[id^="FooterCleanCountryLabel-"], [id^="CountryTriggerLabel-"]');
    const footerTriggerFlag = document.querySelector('[id^="CountryTriggerFlag-"]');
    const footerInput = document.querySelector('[id^="FooterCountryInput-"]');
    if (footerInput) footerInput.value = countryCode;
    if (footerTriggerLabel) footerTriggerLabel.textContent = `${getCountryName(countryCode)} (${currencyCode})`;
    if (footerTriggerFlag) {
      footerTriggerFlag.src = 'https://flagcdn.com/w40/' + countryCode.toLowerCase() + '.png';
      footerTriggerFlag.srcset = 'https://flagcdn.com/w80/' + countryCode.toLowerCase() + '.png 2x';
    }

    // 3. Update Country Popup Trigger & Input
    const popupTriggerName = document.querySelector('[id^="CountryModalTriggerName-"]');
    const popupTriggerFlag = document.querySelector('[id^="CountryModalTriggerFlag-"]');
    const popupHiddenInput = document.querySelector('[id^="CountryModalHiddenInput-"]');
    if (popupHiddenInput) popupHiddenInput.value = countryCode;
    if (popupTriggerName) popupTriggerName.textContent = getCountryName(countryCode);
    if (popupTriggerFlag) {
      popupTriggerFlag.src = 'https://flagcdn.com/w40/' + countryCode.toLowerCase() + '.png';
      popupTriggerFlag.srcset = 'https://flagcdn.com/w80/' + countryCode.toLowerCase() + '.png 2x';
    }

    // 4. Update Announcement Bar (e.g., "We ship to Switzerland" -> "We ship to [Visitor's Country]")
    updateAnnouncementShippingCountry(countryCode);
  }

  function updateAnnouncementShippingCountry(countryCode) {
    const cName = getCountryName(countryCode);
    if (!cName) return;

    // 1. Direct span update (rendered via sections/annoucement.liquid)
    const countrySpans = document.querySelectorAll('[data-announcement-country], .m-announcement-country');
    countrySpans.forEach(function (span) {
      span.textContent = cName;
    });

    // 2. Full text update for any element containing "We ship to"
    const announcementContainers = document.querySelectorAll(
      '.m-announcement-bar, .m-announcement-bar__custom, .m-topbar, .top-announcement'
    );
    announcementContainers.forEach(function (container) {
      const textElements = container.querySelectorAll('a, span');
      textElements.forEach(function (el) {
        if (!el.querySelector('[data-announcement-country]')) {
          if (/We ship to/i.test(el.textContent)) {
            el.textContent = el.textContent.replace(/We ship to\s+([A-Za-z\s&'-]+)/gi, 'We ship to ' + cName);
          }
        }
      });
    });
  }

  function detectVisitorCountry() {
    let savedCountry = null;
    try {
      savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
    } catch (e) {}

    // If customer already has a chosen preference in localStorage, keep it
    if (savedCountry) {
      updateAnnouncementShippingCountry(savedCountry);
      return;
    }

    // Call Shopify's native edge geolocation API
    fetch('/browsing_context_suggestions.json')
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && data.detected_values) {
          const detectedCountry = data.detected_values.country;
          const detectedCountryCode = (detectedCountry && detectedCountry.handle) || null;
          const detectedCountryName = data.detected_values.country_name || (detectedCountry && detectedCountry.name);

          if (detectedCountryCode) {
            const countryCode = detectedCountryCode.toUpperCase();
            try {
              if (!localStorage.getItem(COUNTRY_STORAGE_KEY)) {
                localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
              }
            } catch (e) {}

            const targetCurrency = COUNTRY_CURRENCY_MAP[countryCode] || getActiveCurrency();
            syncAllSelectors(targetCurrency, countryCode);

            if (detectedCountryName) {
              const countrySpans = document.querySelectorAll('[data-announcement-country], .m-announcement-country');
              countrySpans.forEach(function (span) {
                span.textContent = detectedCountryName;
              });
            }
          }
        }
      })
      .catch(function () {
        const fallbackCode = (window.MinimogSettings && window.MinimogSettings.country_code) || getActiveCountry();
        if (fallbackCode) {
          updateAnnouncementShippingCountry(fallbackCode);
        }
      });
  }

  function setCurrency(currencyCode, countryCode) {
    if (!currencyCode && countryCode) {
      currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
    }
    if (!countryCode && currencyCode) {
      // Find first country mapped to this currency
      for (const [c, cur] of Object.entries(COUNTRY_CURRENCY_MAP)) {
        if (cur === currencyCode) {
          countryCode = c;
          break;
        }
      }
    }
    currencyCode = currencyCode || 'USD';
    countryCode = countryCode || 'CH';

    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
      localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
    } catch (e) {}

    updateProductCardPrices(currencyCode);
    syncAllSelectors(currencyCode, countryCode);

    window.dispatchEvent(
      new CustomEvent('currency:changed', {
        detail: { currency: currencyCode, country: countryCode }
      })
    );
  }

  // Intercept localization form changes and submissions sitewide
  function setupFormListeners() {
    document.addEventListener('change', function (e) {
      const select = e.target.closest('[data-localization-select], .js-selectNative');
      if (select) {
        const val = select.value;
        if (val) {
          if (CURRENCIES[val]) {
            setCurrency(val, null);
          } else if (COUNTRY_CURRENCY_MAP[val.toUpperCase()]) {
            setCurrency(COUNTRY_CURRENCY_MAP[val.toUpperCase()], val);
          }
        }
      }
    });
  }

  // Observe dynamically added product cards (AJAX tabs, pagination, search results)
  function observeDynamicContent() {
    if (!window.MutationObserver) return;
    const observer = new MutationObserver(function (mutations) {
      let shouldUpdate = false;
      for (let i = 0; i < mutations.length; i++) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j++) {
          const node = addedNodes[j];
          if (node.nodeType === 1 && (node.classList?.contains('m-product-card') || node.querySelector?.('.m-price, .m-price-item'))) {
            shouldUpdate = true;
            break;
          }
        }
        if (shouldUpdate) break;
      }
      if (shouldUpdate) {
        updateProductCardPrices(getActiveCurrency());
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Public API on window
  window.CurrencyEngine = {
    setCurrency: setCurrency,
    getActiveCurrency: getActiveCurrency,
    getActiveCountry: getActiveCountry,
    getCountryName: getCountryName,
    updateAnnouncementShippingCountry: updateAnnouncementShippingCountry,
    formatMoney: formatMoneyValue,
    currencies: CURRENCIES,
    countryMap: COUNTRY_CURRENCY_MAP
  };

  // Initialize on load
  function init() {
    const activeCurr = getActiveCurrency();
    const activeCountry = getActiveCountry();

    // Cache initial base prices on all existing price elements
    document.querySelectorAll('.m-price-item, .m-price, [data-amount]').forEach(function (el) {
      parsePriceToCents(el);
    });

    if (activeCurr) {
      updateProductCardPrices(activeCurr);
      syncAllSelectors(activeCurr, activeCountry);
    }

    // Auto-detect visitor's country on first visit via Shopify edge geolocation
    detectVisitorCountry();

    setupFormListeners();
    observeDynamicContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
