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
    AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', format: 'AED {{amount}}', rate: 3.67, precision: 2 },
    SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', format: 'SAR {{amount}}', rate: 3.75, precision: 2 },
    QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', format: 'QAR {{amount}}', rate: 3.64, precision: 2 },
    KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', format: 'KWD {{amount}}', rate: 0.31, precision: 2 },
    BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', format: 'BHD {{amount}}', rate: 0.38, precision: 2 },
    OMR: { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', format: 'OMR {{amount}}', rate: 0.38, precision: 2 },
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

  // Comprehensive Country Code to Default Currency Mapping
  const COUNTRY_CURRENCY_MAP = {
    // North America
    US: 'USD',
    CA: 'CAD',
    MX: 'MXN',
    // Europe
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
    VA: 'EUR',
    SM: 'EUR',
    XK: 'EUR',
    BA: 'EUR',
    MK: 'EUR',
    RS: 'EUR',
    BG: 'EUR',
    RO: 'EUR',
    HR: 'EUR',
    PL: 'PLN',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    IS: 'EUR',
    CZ: 'EUR',
    HU: 'EUR',
    UA: 'USD',
    TR: 'TRY',
    // Middle East
    AE: 'AED',
    SA: 'SAR',
    QA: 'QAR',
    KW: 'KWD',
    BH: 'BHD',
    OM: 'OMR',
    JO: 'USD',
    LB: 'USD',
    EG: 'USD',
    IQ: 'USD',
    IL: 'USD',
    // Asia-Pacific
    AU: 'AUD',
    NZ: 'NZD',
    JP: 'JPY',
    SG: 'SGD',
    HK: 'HKD',
    KR: 'KRW',
    CN: 'CNY',
    TW: 'USD',
    MY: 'USD',
    TH: 'USD',
    ID: 'USD',
    PH: 'USD',
    VN: 'USD',
    BD: 'BDT',
    IN: 'INR',
    PK: 'USD',
    LK: 'USD',
    NP: 'USD',
    KH: 'USD',
    MV: 'USD',
    // Americas
    BR: 'BRL',
    AR: 'USD',
    CL: 'USD',
    CO: 'USD',
    PE: 'USD',
    EC: 'USD',
    UY: 'USD',
    CR: 'USD',
    PA: 'USD',
    DO: 'USD',
    JM: 'USD',
    BS: 'USD',
    BB: 'USD',
    TT: 'USD',
    AI: 'USD',
    AG: 'USD',
    BO: 'USD',
    // Africa
    ZA: 'ZAR',
    MA: 'USD',
    DZ: 'USD',
    TN: 'USD',
    NG: 'USD',
    KE: 'USD',
    GH: 'USD',
    ET: 'USD',
    TZ: 'USD',
    UG: 'USD',
    AO: 'USD',
    CM: 'USD',
    CV: 'USD'
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
    CY: 'Cyprus',
    CA: 'Canada',
    AU: 'Australia',
    NZ: 'New Zealand',
    JP: 'Japan',
    SG: 'Singapore',
    HK: 'Hong Kong',
    KR: 'South Korea',
    CN: 'China',
    MY: 'Malaysia',
    ID: 'Indonesia',
    MV: 'Maldives',
    NP: 'Nepal',
    BD: 'Bangladesh',
    IN: 'India',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    KW: 'Kuwait',
    OM: 'Oman',
    BH: 'Bahrain',
    JO: 'Jordan',
    EG: 'Egypt',
    TR: 'Turkey',
    BR: 'Brazil',
    MX: 'Mexico',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    EC: 'Ecuador',
    CR: 'Costa Rica',
    BO: 'Bolivia',
    AR: 'Argentina',
    ZA: 'South Africa',
    MA: 'Morocco',
    CM: 'Cameroon',
    CV: 'Cape Verde',
    AL: 'Albania',
    AD: 'Andorra',
    AO: 'Angola',
    AI: 'Anguilla',
    AG: 'Antigua & Barbuda',
    AM: 'Armenia',
    KH: 'Cambodia'
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

  const STORE_BASE_CURRENCY = 'AED';

  function getBaseCurrency() {
    return STORE_BASE_CURRENCY;
  }

  function getActiveCountry() {
    if (window.MinimogSettings && window.MinimogSettings.country_code) {
      return window.MinimogSettings.country_code.toUpperCase();
    }
    if (window.Shopify && window.Shopify.country) {
      return window.Shopify.country.toUpperCase();
    }
    try {
      const saved = localStorage.getItem(COUNTRY_STORAGE_KEY);
      if (saved) return saved.toUpperCase();
    } catch (e) {}
    return 'CH';
  }

  function getActiveCurrency() {
    if (window.MinimogSettings && window.MinimogSettings.currency_code) {
      return window.MinimogSettings.currency_code.toUpperCase();
    }
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      return window.Shopify.currency.active.toUpperCase();
    }
    const activeCountry = getActiveCountry();
    const marketData = window.MinimogSettings && window.MinimogSettings.market_countries && window.MinimogSettings.market_countries[activeCountry];
    if (marketData && marketData.currency) {
      return marketData.currency.toUpperCase();
    }
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved && CURRENCIES[saved.toUpperCase()]) {
        return saved.toUpperCase();
      }
    } catch (e) {}
    if (activeCountry && COUNTRY_CURRENCY_MAP[activeCountry]) {
      return COUNTRY_CURRENCY_MAP[activeCountry];
    }
    return getBaseCurrency();
  }

  function formatMoneyValue(cents, targetCurrencyCode) {
    if (typeof cents === 'string') {
      cents = parseFloat(cents.replace(/[^0-9.-]/g, ''));
    }
    if (isNaN(cents) || cents == null) cents = 0;

    const currCode = (targetCurrencyCode || getActiveCurrency()).toUpperCase();
    const curr = CURRENCIES[currCode] || {
      code: currCode,
      symbol: (window.MinimogSettings && window.MinimogSettings.currency_symbol) || currCode,
      format: (window.MinimogSettings && window.MinimogSettings.money_format) || `${currCode} {{amount}}`,
      precision: 2
    };

    const precision = curr.precision !== undefined ? curr.precision : 2;
    const val = (cents / 100.0).toFixed(precision);
    const parts = val.split('.');
    const integerPart = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
    const decimalPart = parts[1] ? '.' + parts[1] : '';
    const formattedAmount = integerPart + (precision > 0 ? decimalPart : '');

    let formatStr = curr.format || `${curr.symbol || curr.code} {{amount}}`;
    if (precision === 0) {
      formatStr = formatStr.replace(/\{\{\s*amount\s*\}\}/g, '{{amount_no_decimals}}');
    }

    let result = formatStr
      .replace(/\{\{\s*amount\s*\}\}/g, formattedAmount)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, integerPart);

    return result
      .replace(/^([^\d\s]+)(\d)/, '$1 $2')
      .replace(/(\d)([^\d\s.,]+)$/, '$1 $2')
      .replace(/Dhs\.?/gi, 'AED')
      .replace(/AED(\d)/gi, 'AED $1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parsePriceToCents(el) {
    // 1. Check data-base-price or data-amount or data-price attribute on el
    if (el.hasAttribute('data-base-price')) {
      const val = parseFloat(el.getAttribute('data-base-price'));
      if (!isNaN(val) && val > 0) return val;
    }
    if (el.hasAttribute('data-amount')) {
      const val = parseFloat(el.getAttribute('data-amount'));
      if (!isNaN(val) && val > 0) {
        el.setAttribute('data-base-price', val);
        return val;
      }
    }
    if (el.hasAttribute('data-price')) {
      const val = parseFloat(el.getAttribute('data-price'));
      if (!isNaN(val) && val > 0) {
        el.setAttribute('data-base-price', val);
        return val;
      }
    }

    // 2. Check parent container (like .m-price) for data-price
    const priceParent = el.closest ? el.closest('.m-price, [data-price]') : null;
    if (priceParent) {
      if (priceParent.hasAttribute('data-base-price')) {
        const val = parseFloat(priceParent.getAttribute('data-base-price'));
        if (!isNaN(val) && val > 0) {
          el.setAttribute('data-base-price', val);
          return val;
        }
      }
      if (priceParent.hasAttribute('data-price')) {
        const val = parseFloat(priceParent.getAttribute('data-price'));
        if (!isNaN(val) && val > 0) {
          el.setAttribute('data-base-price', val);
          return val;
        }
      }
    }

    // 3. Parse numbers from textContent
    const text = el.textContent.replace(/[^0-9.,]/g, '').trim();
    if (!text) return null;

    let num = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      if (text.includes('.') && num < 100000) {
        const cents = Math.round(num * 100);
        el.setAttribute('data-base-price', cents);
        return cents;
      } else {
        const cents = Math.round(num);
        el.setAttribute('data-base-price', cents);
        return cents;
      }
    }
    return null;
  }

  function ensurePriceSpacing(root) {
    const scope = root || document;
    const selectors = [
      '.m-luxury-product-price',
      '.m-luxury-product-price--sale',
      '.m-luxury-product-price--compare',
      '.m-price-item',
      '.m-cart-item__price',
      '[data-cart-subtotal-price]',
      '.m-right-price',
      '.m-right-price-regular',
      '.m-right-price-compare',
      '#m-right-cart-subtotal',
      '[data-line-price]',
      '.m-right-wishlist-price-regular',
      '.m-right-wishlist-price-compare',
      '.m-right-coll-card__price-row span',
      '.m-stl-product__price'
    ];
    scope.querySelectorAll(selectors.join(', ')).forEach(function (el) {
      if (el.children.length === 0 && el.textContent) {
        el.textContent = el.textContent
          .replace(/^([^\d\s]+)(\d)/, '$1 $2')
          .replace(/(\d)([^\d\s.,]+)$/, '$1 $2')
          .replace(/Dhs\.?/gi, 'AED')
          .replace(/AED(\d)/gi, 'AED $1')
          .replace(/\s+/g, ' ')
          .trim();
      }
    });
  }

  function updateProductCardPrices(targetCurrency) {
    if (!targetCurrency || !CURRENCIES[targetCurrency]) {
      targetCurrency = getActiveCurrency();
    }
    const targetCurr = CURRENCIES[targetCurrency] || CURRENCIES.USD;

    // Specific price text elements only - NEVER query container elements like .m-price!
    const leafSelectors = [
      '.m-price-item--regular:not(s)',
      '.m-price-item--sale',
      's.m-price-item--regular',
      '.m-luxury-product-price',
      '.m-luxury-product-price--sale',
      '.m-luxury-product-price--compare',
      '.m-cart-item__price',
      '.m-right-price',
      '.m-right-price-regular',
      '.m-right-price-compare',
      '#m-right-cart-subtotal',
      '[data-line-price]',
      '.m-right-wishlist-price-regular',
      '.m-right-wishlist-price-compare',
      '.m-right-coll-card__price-row span',
      '.m-stl-product__price',
      '[data-cart-subtotal-price]'
    ];

    const leafElements = document.querySelectorAll(leafSelectors.join(', '));
    leafElements.forEach(function (item) {
      // Safety check: ensure element doesn't contain other price items
      if (item.querySelector && item.querySelector('.m-price-item, .m-price')) return;

      const cents = parsePriceToCents(item);
      if (cents != null && cents > 0) {
        item.textContent = formatMoneyValue(cents, targetCurrency);
      }
    });

    // Standalone .m-price without price-item children
    document.querySelectorAll('.m-price').forEach(function (p) {
      if (p.children.length === 0 && p.textContent.trim()) {
        const cents = parsePriceToCents(p);
        if (cents != null && cents > 0) {
          p.textContent = formatMoneyValue(cents, targetCurrency);
        }
      }
    });

    // Update MinimogSettings for theme JS compatibility
    if (window.MinimogSettings) {
      window.MinimogSettings.currency_code = targetCurr.code;
      window.MinimogSettings.money_format = targetCurr.format;
    }

    ensurePriceSpacing();
  }

  function updateComponentFlag(component, countryCode) {
    const flagContainer = component.querySelector('.m-country-flag-icon');
    if (!flagContainer) return;
    const code = (countryCode || '').toUpperCase();
    if (code === 'CH') {
      flagContainer.innerHTML = '<svg viewBox="0 0 512 512" width="16" height="16" style="display: block; border-radius: 50%;"><circle cx="256" cy="256" r="256" fill="#D52B1E"/><path fill="#FFFFFF" d="M216 116h80v100h100v80H296v100h-80V296H116v-80h100V116z"/></svg>';
      return;
    }
    const matchingCustomOpt = component.querySelector(`.m-select-custom--option[data-value="${code}"]`);
    if (matchingCustomOpt) {
      const optFlag = matchingCustomOpt.querySelector('svg, .m-country-flags, img');
      if (optFlag) {
        flagContainer.innerHTML = optFlag.outerHTML;
        return;
      }
    }
    flagContainer.innerHTML = `<span class="m-country-flags m-country-flags--${code}"></span>`;
  }

  function sanitizeCurrencyAttributes() {
    // Ensure all custom options, native options, and footer items have the real country currency
    const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
    const elements = document.querySelectorAll(
      '.m-select-custom--option[data-value], option[data-value], select[name="country_code"] option, .m-crm-item[data-value], [class*="country-item"][data-value]'
    );
    elements.forEach(function (opt) {
      const code = (opt.getAttribute('data-value') || opt.value || '').toUpperCase();
      if (code && code.length === 2) {
        const mapped = (marketCountries && marketCountries[code] && marketCountries[code].currency) || COUNTRY_CURRENCY_MAP[code];
        if (mapped) {
          opt.setAttribute('data-currency', mapped);
          const currSpan = opt.querySelector('[class*="__currency-code"], .m-currency-code');
          if (currSpan) {
            currSpan.textContent = '(' + mapped + ')';
          }
        }
      }
    });
  }

  function syncAllSelectors(currencyCode, countryCode) {
    const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
    const marketCountry = marketCountries && marketCountries[countryCode];
    if (marketCountry && marketCountry.currency) {
      currencyCode = marketCountry.currency;
    }
    const cName = (marketCountry && marketCountry.name) || getCountryName(countryCode);
    sanitizeCurrencyAttributes();

    // 1. Update Megamenu / Mobile Menu Selectors
    const customSelects = document.querySelectorAll('m-select-component');
    customSelects.forEach(function (component) {
      const nativeSelect = component.querySelector('.js-selectNative');
      if (nativeSelect) {
        const isCountrySelector = component.querySelector('.m-country-flag-icon') || nativeSelect.name === 'country_code';
        const targetVal = isCountrySelector ? countryCode : currencyCode;
        const matchingOption = nativeSelect.querySelector(`option[value="${targetVal}"]`) || nativeSelect.querySelector(`option[value="${currencyCode}"], option[value="${countryCode}"]`);
        if (matchingOption) {
          nativeSelect.value = matchingOption.value;
          const triggerText = component.querySelector('.m-select-custom--trigger-text');
          if (triggerText) {
            triggerText.textContent = isCountrySelector ? cName : (matchingOption.text || matchingOption.value);
          }
          const optList = component.querySelectorAll('.m-select-custom--option');
          optList.forEach(function (opt) {
            if (opt.getAttribute('data-value') === matchingOption.value) {
              opt.classList.add('isActive');
            } else {
              opt.classList.remove('isActive');
            }
          });
          if (isCountrySelector) {
            updateComponentFlag(component, matchingOption.value);
          }
        }
      }
    });

    // 2. Update Custom Footer Country/Currency Trigger
    const footerTriggerLabel = document.querySelector('[id^="FooterCleanCountryLabel-"], [id^="CountryTriggerLabel-"]');
    const footerTriggerFlag = document.querySelector('[id^="CountryTriggerFlag-"]');
    const footerInput = document.querySelector('[id^="FooterCountryInput-"], [id^="FooterCleanCountryInput-"]');
    if (footerInput) footerInput.value = countryCode;
    if (footerTriggerLabel) footerTriggerLabel.textContent = `${cName} (${currencyCode})`;
    if (footerTriggerFlag) {
      footerTriggerFlag.src = 'https://flagcdn.com/w40/' + countryCode.toLowerCase() + '.png';
      footerTriggerFlag.srcset = 'https://flagcdn.com/w80/' + countryCode.toLowerCase() + '.png 2x';
    }

    // 3. Update Country Popup Trigger & Input
    const popupTriggerName = document.querySelector('[id^="CountryModalTriggerName-"]');
    const popupTriggerFlag = document.querySelector('[id^="CountryModalTriggerFlag-"]');
    const popupHiddenInput = document.querySelector('[id^="CountryModalHiddenInput-"]');
    if (popupHiddenInput) popupHiddenInput.value = countryCode;
    if (popupTriggerName) popupTriggerName.textContent = cName;
    if (popupTriggerFlag) {
      popupTriggerFlag.src = 'https://flagcdn.com/w40/' + countryCode.toLowerCase() + '.png';
      popupTriggerFlag.srcset = 'https://flagcdn.com/w80/' + countryCode.toLowerCase() + '.png 2x';
    }

    // 4. Update Announcement Bar
    updateAnnouncementShippingCountry(countryCode);
  }

  function updateAnnouncementShippingCountry(countryCode) {
    const cName = getCountryName(countryCode);
    if (!cName) return;

    const countrySpans = document.querySelectorAll('[data-announcement-country], .m-announcement-country');
    countrySpans.forEach(function (span) {
      span.textContent = cName;
    });

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

    if (savedCountry) {
      updateAnnouncementShippingCountry(savedCountry);
      syncAllSelectors(getActiveCurrency(), savedCountry);
      return;
    }

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
            try {
              if (!localStorage.getItem(CURRENCY_STORAGE_KEY)) {
                localStorage.setItem(CURRENCY_STORAGE_KEY, targetCurrency);
              }
            } catch (e) {}

            updateProductCardPrices(targetCurrency);
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
          syncAllSelectors(getActiveCurrency(), fallbackCode);
        }
      });
  }

  function setCurrency(currencyCode, countryCode) {
    countryCode = (countryCode || getActiveCountry() || 'CH').toUpperCase();
    const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
    const marketData = marketCountries && marketCountries[countryCode];
    if (marketData && marketData.currency) {
      currencyCode = marketData.currency.toUpperCase();
    } else if (!currencyCode || !CURRENCIES[currencyCode.toUpperCase()]) {
      currencyCode = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
    }
    currencyCode = currencyCode.toUpperCase();

    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
      localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
    } catch (e) {}

    syncAllSelectors(currencyCode, countryCode);
    ensurePriceSpacing();

    window.dispatchEvent(
      new CustomEvent('currency:changed', {
        detail: { currency: currencyCode, country: countryCode }
      })
    );
  }

  function setupFormListeners() {
    // 1. Native change event listener on document (capture phase)
    document.addEventListener('change', function (e) {
      const select = e.target.closest('[data-localization-select], .js-selectNative');
      if (select) {
        const val = (select.value || '').toUpperCase();
        const selectedOpt = select.options && select.options[select.selectedIndex];
        const currencyAttr = selectedOpt ? selectedOpt.getAttribute('data-currency') : null;
        if (val) {
          const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
          const marketData = marketCountries && marketCountries[val];
          const curr = (marketData && marketData.currency) || currencyAttr || COUNTRY_CURRENCY_MAP[val] || 'USD';
          setCurrency(curr, val);
        }
      }
    }, true);

    // 2. Custom select option click listener
    document.addEventListener('click', function (e) {
      const opt = e.target.closest('.m-select-custom--option');
      if (opt) {
        const selectComponent = opt.closest('m-select-component');
        const isCountry = selectComponent && (selectComponent.querySelector('.m-country-flag-icon') || selectComponent.querySelector('[name="country_code"]'));
        if (isCountry) {
          const val = (opt.getAttribute('data-value') || '').toUpperCase();
          const currAttr = opt.getAttribute('data-currency');
          const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
          const marketData = marketCountries && marketCountries[val];
          const curr = (marketData && marketData.currency) || currAttr || COUNTRY_CURRENCY_MAP[val] || 'USD';
          if (val) {
            setCurrency(curr, val);
          }
        }
      }

      const footerItem = e.target.closest('.m-crm-item, [class*="country-item"]');
      if (footerItem) {
        const val = (footerItem.getAttribute('data-value') || '').toUpperCase();
        const currAttr = footerItem.getAttribute('data-currency');
        const marketCountries = window.MinimogSettings && window.MinimogSettings.market_countries;
        const marketData = marketCountries && marketCountries[val];
        const curr = (marketData && marketData.currency) || currAttr || COUNTRY_CURRENCY_MAP[val] || 'USD';
        if (val) {
          setCurrency(curr, val);
        }
      }
    }, true);
  }

  function observeDynamicContent() {
    if (!window.MutationObserver) return;
    const observer = new MutationObserver(function (mutations) {
      let shouldUpdate = false;
      for (let i = 0; i < mutations.length; i++) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j++) {
          const node = addedNodes[j];
          if (node.nodeType === 1 && (node.classList?.contains('m-product-card') || node.querySelector?.('.m-price, .m-price-item, .m-luxury-product-price, .m-right-price'))) {
            shouldUpdate = true;
            break;
          }
        }
        if (shouldUpdate) break;
      }
      if (shouldUpdate) {
        ensurePriceSpacing();
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
    ensurePriceSpacing: ensurePriceSpacing,
    formatMoney: formatMoneyValue,
    currencies: CURRENCIES,
    countryMap: COUNTRY_CURRENCY_MAP
  };

  function init() {
    // Intercept Shopify.formatMoney so space is ALWAYS enforced for all currencies
    if (typeof window.Shopify === 'undefined') window.Shopify = {};
    const origShopifyFormatMoney = window.Shopify.formatMoney;
    window.Shopify.formatMoney = function (cents, format) {
      let output = '';
      if (typeof origShopifyFormatMoney === 'function') {
        output = origShopifyFormatMoney(cents, format);
      } else {
        const activeCurr = getActiveCurrency();
        output = formatMoneyValue(cents, activeCurr);
      }
      return output
        .replace(/^([^\d\s]+)(\d)/, '$1 $2')
        .replace(/(\d)([^\d\s.,]+)$/, '$1 $2')
        .replace(/Dhs\.?/gi, 'AED')
        .replace(/AED(\d)/gi, 'AED $1')
        .replace(/\s+/g, ' ')
        .trim();
    };

    sanitizeCurrencyAttributes();

    const activeCountry = getActiveCountry();
    const activeCurr = getActiveCurrency();

    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY, activeCountry);
      localStorage.setItem(CURRENCY_STORAGE_KEY, activeCurr);
    } catch (e) {}

    syncAllSelectors(activeCurr, activeCountry);
    ensurePriceSpacing();

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
