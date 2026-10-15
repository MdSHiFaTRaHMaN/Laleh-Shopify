/**
 * Minimog MegaMenu, Luxury Left Drawer & Real-Time Dynamic Right Utility Drawer Controller
 */
function safeQueryDomNodes(selectors, context = document) {
  if (typeof queryDomNodes === "function") {
    try {
      return queryDomNodes(selectors, context);
    } catch (e) {}
  }
  const domNodes = {};
  for (const [key, selector] of Object.entries(selectors)) {
    if (Array.isArray(selector)) {
      domNodes[key] = context.querySelectorAll(selector[0]);
    } else if (typeof selector === "string") {
      domNodes[key] = context.querySelector(selector);
    }
  }
  return domNodes;
}

// Utility to format money if Shopify.formatMoney is not globally defined
function formatMoney(cents) {
  let result = "";
  if (window.CurrencyEngine && typeof window.CurrencyEngine.formatMoney === 'function') {
    result = window.CurrencyEngine.formatMoney(cents, window.CurrencyEngine.getActiveCurrency());
  } else if (typeof Shopify !== "undefined" && typeof Shopify.formatMoney === "function") {
    result = Shopify.formatMoney(cents, MinimogSettings?.money_format || "$ {{amount}}");
  } else {
    const dollars = (cents / 100).toFixed(2);
    result = "$ " + dollars;
  }
  return result
    .replace(/^([^\d\s]+)(\d)/, '$1 $2')
    .replace(/(\d)([^\d\s.,]+)$/, '$1 $2')
    .replace(/Dhs\.?/gi, 'AED')
    .replace(/AED(\d)/gi, 'AED $1')
    .replace(/\s+/g, ' ')
    .trim();
}

// LALEH Official Product Names (English / Latin script across all languages)
const LALEH_OFFICIAL_PRODUCT_NAMES = {
  'obsidian-touch': 'OBSIDIAN TOUCH',
  'structured-silence': 'STRUCTURED SILENCE',
  'vermeil': 'VERMEIL',
  'crimson-poise': 'CRIMSON POISE',
  'iris-pearl': 'IRIS PEARL',
  'lilac-verse': 'LILAC VERSE'
};

function getLalehOfficialTitle(handle, defaultTitle) {
  if (handle) {
    const cleanHandle = String(handle).toLowerCase().trim();
    if (LALEH_OFFICIAL_PRODUCT_NAMES[cleanHandle]) {
      return LALEH_OFFICIAL_PRODUCT_NAMES[cleanHandle];
    }
  }
  if (defaultTitle) {
    const down = String(defaultTitle).toLowerCase();
    if (down.includes('obsidian')) return 'OBSIDIAN TOUCH';
    if (down.includes('structured') || down.includes('silence')) return 'STRUCTURED SILENCE';
    if (down.includes('vermeil')) return 'VERMEIL';
    if (down.includes('crimson') || down.includes('poise')) return 'CRIMSON POISE';
    if (down.includes('iris') || down.includes('pearl')) return 'IRIS PEARL';
    if (down.includes('lilac') || down.includes('verse')) return 'LILAC VERSE';
  }
  if (handle) {
    return String(handle).replace(/[-_]+/g, ' ').toUpperCase();
  }
  return defaultTitle || '';
}

class Megamenu {
  constructor(container) {
    this.selectors = {
      announcementBar: ".m-announcement-bar",
      hamburgerButtons: ".m-hamburger-box, .m-menu-toggle-btn, [data-drawer-trigger]",
      desktopMenuItems: [".m-menu__item"],
      desktopSubMenus: ".m-mega-menu",
      headerMobile: ".m-header__mobile",
      menuDrawer: "#m-menu-drawer",
      menuDrawerContent: ".m-menu-drawer__content, .m-luxury-drawer__panel",
      menu: ".m-menu-mobile, .m-luxury-drawer__nav",
      menuItems: [".m-menu-mobile__item, .m-luxury-drawer__nav-item"],
      megaMenuMobile: [".m-megamenu-mobile, .m-luxury-drawer__submenu-panel"],
      backDrop: ".m-menu-drawer__backdrop, .m-luxury-drawer__backdrop, [data-drawer-close]",
      rightDrawer: "#m-right-utility-drawer",
    };
    this.menuSelectors = {
      subMenu: ".m-mega-menu",
    };
    this.activeDesktopMenuItem = null;

    this.sliders = {};
    this.open = false;
    this.rightDrawerOpen = false;
    this.container = container;
    this.domNodes = safeQueryDomNodes(this.selectors, document);
    
    if (this.domNodes.desktopMenuItems) {
      this.menuData = [...this.domNodes.desktopMenuItems].map((item) => {
        const header = item.closest("header");
        const menuNodes = safeQueryDomNodes(this.menuSelectors, item);
        return { header, item, ...menuNodes, active: false };
      });
    } else {
      this.menuData = [];
    }

    this.wishlistStorageKey = "m-wishlist-products";
    this.searchDebounceTimer = null;

    this.init();

    if (typeof MinimogTheme !== "undefined") {
      MinimogTheme.headerSliders = this.sliders;
    }
  }

  init() {
    // Ensure global document-level event listeners are registered only ONCE across instances
    if (!Megamenu._globalEventsAttached) {
      Megamenu._globalEventsAttached = true;

      // 1. Global Capture-Phase Event Delegation for Header Icons and Drawer
      document.addEventListener("click", (e) => {
        const instance = window.MinimogMegaMenu || this;

        // --- Search Icon Trigger ---
        const searchTrigger = e.target.closest(
          "m-search-popup, [data-open-search-popup], .m-header__search, .m-header__search-icon, .m-search-form__button, [data-open-right-drawer='search']"
        );
        if (searchTrigger) {
          e.preventDefault();
          e.stopPropagation();
          instance.openRightDrawer("search");
          return;
        }

        // --- Wishlist Icon Trigger ---
        const wishlistTrigger = e.target.closest(
          ".m-header__wishlist, a[href*='wishlist'], .ssw-link-fave-menu, [data-open-right-drawer='wishlist']"
        );
        if (wishlistTrigger) {
          e.preventDefault();
          e.stopPropagation();
          instance.openRightDrawer("wishlist");
          return;
        }

        // --- Cart / Bag Icon Trigger ---
        const cartTrigger = e.target.closest(
          ".m-cart-icon-bubble, a[href*='/cart'], .m-header__mobile-right a[href*='/cart'], .m-header__right-luxury a[href*='/cart'], [data-open-right-drawer='cart']"
        );
        if (cartTrigger) {
          e.preventDefault();
          e.stopPropagation();
          instance.openRightDrawer("cart");
          return;
        }

        // --- Right Drawer Close Buttons / Backdrop ---
        const rightDrawerClose = e.target.closest(
          "[data-close-right-drawer], .m-luxury-right-drawer__close-btn, .m-luxury-right-drawer__backdrop"
        );
        if (rightDrawerClose) {
          e.preventDefault();
          e.stopPropagation();
          instance.closeRightDrawer();
          return;
        }

        // --- Right Drawer Tab Switching (Search | Wishlist | Bag) ---
        const rightDrawerTab = e.target.closest(".m-luxury-right-drawer__tab");
        if (rightDrawerTab) {
          e.preventDefault();
          const targetSelector = rightDrawerTab.dataset.tabTarget;
          if (!targetSelector) return;
          instance.switchRightDrawerTab(rightDrawerTab, targetSelector);
          return;
        }

        // --- Country / Region / Currency Trigger from Menu Drawer ---
        const countryTrigger = e.target.closest(
          "[data-open-country-modal], .m-luxury-country-pill"
        );
        if (countryTrigger) {
          e.preventDefault();
          e.stopPropagation();
          instance.closeMenu();
          if (typeof window.openCountryRegionModal === "function") {
            window.openCountryRegionModal();
          } else {
            const modal = document.querySelector(".m-crm-wrapper");
            if (modal) {
              modal.classList.add("is-active");
              modal.setAttribute("aria-hidden", "false");
            }
          }
          return;
        }

        // --- Real Ajax Cart Quantity Stepper (+ / -) ---
        const cartQtyBtn = e.target.closest("[data-ajax-qty-change]");
        if (cartQtyBtn) {
          e.preventDefault();
          const delta = parseInt(cartQtyBtn.dataset.ajaxQtyChange, 10) || 0;
          const lineKey = cartQtyBtn.dataset.key;
          const stepper = cartQtyBtn.closest(".m-right-qty-stepper");
          const valEl = stepper ? stepper.querySelector("[data-qty-display]") : null;
          if (valEl && lineKey) {
            const currentVal = parseInt(valEl.textContent.trim(), 10) || 1;
            const newQty = Math.max(0, currentVal + delta);
            valEl.textContent = newQty;
            instance.updateShopifyCartItem(lineKey, newQty, cartQtyBtn.closest(".m-right-item-card"));
          }
          return;
        }

        // --- Real Ajax Cart Item Removal ---
        const cartRemoveBtn = e.target.closest("[data-ajax-remove-cart]");
        if (cartRemoveBtn) {
          e.preventDefault();
          const lineKey = cartRemoveBtn.dataset.ajaxRemoveCart;
          if (lineKey) {
            instance.updateShopifyCartItem(lineKey, 0, cartRemoveBtn.closest(".m-right-item-card"));
          }
          return;
        }

        // --- Real Wishlist "Add to bag" ---
        const wishlistAddBtn = e.target.closest("[data-wishlist-add-to-bag]");
        if (wishlistAddBtn) {
          e.preventDefault();
          if (wishlistAddBtn.dataset.adding === "true") return;
          const variantId = wishlistAddBtn.dataset.wishlistVariantId;
          if (variantId) {
            wishlistAddBtn.dataset.adding = "true";
            instance.addProductToShopifyCart(variantId, wishlistAddBtn).finally(() => {
              delete wishlistAddBtn.dataset.adding;
            });
          }
          return;
        }

        // --- Style 6 Product Card Quick Add Size Button ---
        const pcardSizeBtn = e.target.closest("[data-pcard-quick-add]");
        if (pcardSizeBtn && !pcardSizeBtn.classList.contains("is-sold-out") && !pcardSizeBtn.disabled) {
          e.preventDefault();
          e.stopPropagation();

          if (pcardSizeBtn.dataset.adding === "true") return;
          pcardSizeBtn.dataset.adding = "true";

          const variantId = pcardSizeBtn.dataset.pcardQuickAdd;
          if (variantId) {
            const originalText = pcardSizeBtn.textContent;
            pcardSizeBtn.textContent = "✓";
            pcardSizeBtn.style.backgroundColor = "#111111";
            pcardSizeBtn.style.color = "#ffffff";
            instance.addProductToShopifyCart(variantId, null).finally(() => {
              setTimeout(() => {
                pcardSizeBtn.textContent = originalText;
                pcardSizeBtn.style.backgroundColor = "";
                pcardSizeBtn.style.color = "";
                delete pcardSizeBtn.dataset.adding;
              }, 1500);
            });
          } else {
            delete pcardSizeBtn.dataset.adding;
          }
          return;
        }

        // --- Complete Your Collection Size Pill Selection ---
        const collSizePill = e.target.closest("[data-coll-size-pill]");
        if (collSizePill && !collSizePill.disabled) {
          e.preventDefault();
          e.stopPropagation();

          const card = collSizePill.closest(".m-right-coll-card");
          if (!card) return;

          const isAlreadySelected = collSizePill.classList.contains("is-selected");

          // Deselect sibling size pills
          card.querySelectorAll("[data-coll-size-pill]").forEach((p) => p.classList.remove("is-selected"));
          collSizePill.classList.add("is-selected");

          const variantId = collSizePill.dataset.variantId;
          const sizeName = collSizePill.dataset.size;
          const variantPriceFormatted = collSizePill.dataset.variantPriceFormatted;

          // Update the Add to Bag button
          const addBtn = card.querySelector("[data-coll-quick-add]");
          if (addBtn) {
            addBtn.dataset.collQuickAdd = variantId;
            const atcPrefix = window.MinimogStrings?.addToBag || 'Add to Bag';
            addBtn.textContent = `+ ${atcPrefix} • ${sizeName}`;
            addBtn.disabled = false;
          }

          // If variant has different price, update the price element
          if (variantPriceFormatted) {
            const priceEl = card.querySelector(".m-right-price-regular");
            if (priceEl) {
              const cleanPrice = variantPriceFormatted.replace(/<[^>]*>/g, '').trim();
              priceEl.textContent = cleanPrice;
              if (collSizePill.dataset.variantPrice) {
                priceEl.dataset.basePrice = collSizePill.dataset.variantPrice;
              }
            }
          }

          // If already selected and tapped again, trigger quick add
          if (isAlreadySelected && addBtn && !addBtn.disabled) {
            addBtn.click();
          }
          return;
        }

        // --- Complete Your Collection Quick Add ---
        const collAddBtn = e.target.closest("[data-coll-quick-add]");
        if (collAddBtn && !collAddBtn.disabled) {
          e.preventDefault();
          e.stopPropagation();

          if (collAddBtn.dataset.adding === "true") return;
          collAddBtn.dataset.adding = "true";

          const variantId = collAddBtn.dataset.collQuickAdd;
          if (variantId) {
            const originalText = collAddBtn.textContent;
            collAddBtn.textContent = "Adding...";
            instance.addProductToShopifyCart(variantId, collAddBtn).finally(() => {
              delete collAddBtn.dataset.adding;
            });
          }
          return;
        }

        // --- Complete Your Collection Slider Navigation Arrows ---
        const collPrevBtn = e.target.closest("[data-coll-slider-prev]");
        if (collPrevBtn) {
          e.preventDefault();
          const track = document.getElementById("m-right-coll-slider-track");
          if (track) {
            track.scrollBy({ left: -160, behavior: "smooth" });
          }
          return;
        }

        const collNextBtn = e.target.closest("[data-coll-slider-next]");
        if (collNextBtn) {
          e.preventDefault();
          const track = document.getElementById("m-right-coll-slider-track");
          if (track) {
            track.scrollBy({ left: 160, behavior: "smooth" });
          }
          return;
        }

        // --- Real Wishlist Item Removal ---
        const wishlistRemoveBtn = e.target.closest("[data-wishlist-remove-handle]");
        if (wishlistRemoveBtn) {
          e.preventDefault();
          const handle = wishlistRemoveBtn.dataset.wishlistRemoveHandle;
          if (handle) {
            instance.removeFromWishlist(handle);
            const card = wishlistRemoveBtn.closest(".m-right-wishlist-card, .m-right-item-card");
            if (card) {
              card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
              card.style.opacity = "0";
              card.style.transform = "translateX(20px)";
              setTimeout(() => {
                card.remove();
                instance.renderWishlistDrawerItems();
              }, 250);
            }
          }
          return;
        }

        // --- Left Drawer Open / Toggle (= Menu) ---
        const leftTrigger = e.target.closest(instance.selectors.hamburgerButtons);
        if (leftTrigger) {
          e.preventDefault();
          e.stopPropagation();
          if (instance.open) {
            instance.closeMenu();
          } else {
            instance.openMenu();
          }
          return;
        }

        // --- Left Drawer Close Button / Backdrop ---
        const leftCloseBtn = e.target.closest(
          ".m-luxury-drawer__close-btn, .m-luxury-drawer__backdrop, [data-drawer-close]"
        );
        if (leftCloseBtn) {
          e.preventDefault();
          e.stopPropagation();
          instance.closeMenu();
          return;
        }

        // --- Left Drawer Category Tabs ---
        const tabBtn = e.target.closest(".m-luxury-drawer__tab");
        if (tabBtn) {
          e.preventDefault();
          const targetSelector = tabBtn.dataset.tabTarget;
          if (!targetSelector) return;

          document.querySelectorAll(".m-luxury-drawer__tab").forEach((t) => t.classList.remove("active"));
          tabBtn.classList.add("active");

          document.querySelectorAll(".m-luxury-drawer__nav").forEach((nav) => nav.classList.remove("active"));
          const targetNav = document.querySelector(targetSelector);
          if (targetNav) {
            targetNav.classList.add("active");
          }

          document.querySelectorAll(".m-luxury-drawer__submenu-panel").forEach((sub) => sub.classList.remove("open"));
          return;
        }

        // --- Left Drawer Submenu Open ---
        const submenuOpenBtn = e.target.closest("[data-open-submenu]");
        if (submenuOpenBtn) {
          const submenuId = submenuOpenBtn.dataset.openSubmenu;
          const submenu = document.getElementById(submenuId);
          if (submenu) {
            e.preventDefault();
            submenu.classList.add("open");
          }
          return;
        }

        // --- Left Drawer Submenu Close ---
        const submenuCloseBtn = e.target.closest("[data-close-submenu]");
        if (submenuCloseBtn) {
          e.preventDefault();
          const submenu = submenuCloseBtn.closest(".m-luxury-drawer__submenu-panel");
          if (submenu) {
            submenu.classList.remove("open");
          }
          return;
        }
      }, true);

      // 4. Keyboard ESC listener
      document.addEventListener("keydown", (e) => {
        const instance = window.MinimogMegaMenu || this;
        if (e.key === "Escape") {
          if (instance.rightDrawerOpen) instance.closeRightDrawer();
          if (instance.open) instance.closeMenu();
        }
      });

      // 5. Global Cart Events Listeners for Zero-Reload Cart Updates across entire store
      this.initGlobalCartSyncListeners();
    }

    // 2. Predictive Live Search Input Listener
    this.initPredictiveSearch();

    // 3. Update Wishlist Count from Storage
    this.updateWishlistCount();

    // 6. Accessibility & MegaMenu
    this.initAccessibilityToggle();
    this.initMobileMegaMenu();
    this.initDesktopMegaMenu();
  }

  // =========================================================================
  // ZERO-RELOAD GLOBAL CART SYNCHRONIZATION
  // =========================================================================
  initGlobalCartSyncListeners() {
    // 1. Listen for custom product added events dispatched by Shopify / theme Ajax forms
    document.addEventListener("product-ajax:added", (e) => {
      this.fetchCartAndRenderDrawer(true);
    });

    // 2. Listen to Minimog Theme PubSub Events
    if (typeof MinimogEvents !== "undefined" && typeof MinimogTheme !== "undefined" && MinimogTheme.pubSubEvents) {
      try {
        MinimogEvents.subscribe(MinimogTheme.pubSubEvents.cartUpdate, (data) => {
          if (data && data.cart && data.cart.items) {
            this.renderCartItemsFromData(data.cart);
            this.openRightDrawer("cart");
          } else {
            this.fetchCartAndRenderDrawer(true);
          }
        });

        MinimogEvents.subscribe(MinimogTheme.pubSubEvents.openCartDrawer, () => {
          this.fetchCartAndRenderDrawer(true);
        });

        MinimogEvents.subscribe(MinimogTheme.pubSubEvents.openSearchPopup, () => {
          this.openRightDrawer("search");
        });
      } catch (e) {}
    }
  }

  async fetchCartAndRenderDrawer(openDrawer = false) {
    try {
      const res = await fetch("/cart.js");
      if (res.ok) {
        const cart = await res.json();
        this.renderCartItemsFromData(cart);
        if (openDrawer) {
          this.openRightDrawer("cart");
        }
      }
    } catch (e) {
      console.error("Error fetching cart data:", e);
    }
  }

  renderCartItemsFromData(cart) {
    const container = document.getElementById("m-cart-items-container");
    const footer = document.getElementById("m-right-cart-footer");
    if (!container) return;

    const items = cart.items || [];
    const itemCount = cart.item_count !== undefined ? cart.item_count : items.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const totalPrice = cart.total_price !== undefined ? cart.total_price : items.reduce((sum, it) => sum + (it.final_line_price || it.price * it.quantity || 0), 0);

    // 1. Update all Cart Badge Counters across header and drawer tabs
    document.querySelectorAll(".m-cart-count-luxury, .m-cart-count").forEach((el) => {
      el.textContent = itemCount;
      if (itemCount === 0) {
        el.classList.add("m:hidden");
      } else {
        el.classList.remove("m:hidden");
      }
    });

    document.querySelectorAll(".m-right-cart-count").forEach((el) => {
      el.textContent = itemCount;
    });

    // 2. Update Subtotal
    const subtotalEl = document.getElementById("m-right-cart-subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(totalPrice);
    }

    // 3. Render Cart Items or Empty State
    if (items.length === 0) {
      const emptyText = window.MinimogStrings?.emptyBag || "Your bag is currently empty.";
      const startShopText = window.MinimogStrings?.startShopping || "Start Shopping";
      container.innerHTML = `
        <div class="m-right-cart-empty-state" style="text-align: center; padding: 40px 0;">
          <p style="color: rgba(var(--color-foreground), 0.6); font-size: 13.5px; margin-bottom: 16px;">
            ${emptyText}
          </p>
          <a href="/collections/all" class="m-right-checkout-btn" style="text-decoration: none;">
            ${startShopText}
          </a>
        </div>
      `;
      if (footer) {
        footer.classList.remove("active");
        footer.classList.add("m:hidden");
      }
      const collSection = document.getElementById("m-right-complete-collection");
      if (collSection) {
        collSection.classList.remove("m:hidden");
        document.querySelectorAll("#m-right-coll-slider-track .m-right-coll-card").forEach((card) => {
          card.style.display = "";
        });
      }
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const itemHandle = item.handle || (item.url ? item.url.split('/products/')[1]?.split('?')[0] : '');
        const itemTitle = getLalehOfficialTitle(itemHandle, item.product_title || item.title);
        const imgSrc = item.image || item.featured_image?.url || "";
        const hasVariant = item.variant_title && item.variant_title !== "Default Title";
        const comparePriceFormatted =
          item.original_line_price > item.final_line_price
            ? `<span class="m-right-price-compare">${formatMoney(item.original_line_price)}</span>`
            : "";
        const priceFormatted = formatMoney(item.final_line_price || (item.price * item.quantity));

        return `
          <div class="m-right-item-card" data-cart-item-key="${item.key}">
            <a href="${item.url || '#'}" class="m-right-item-card__media">
              ${
                imgSrc
                  ? `<img src="${imgSrc}" alt="${itemTitle}" loading="lazy">`
                  : `<div style="width:100%;height:100%;background:#f3f3f3;"></div>`
              }
            </a>
            <div class="m-right-item-card__details">
              <a href="${item.url || '#'}" class="m-right-item-card__title notranslate" translate="no" style="text-decoration: none;">
                ${itemTitle}
              </a>
              ${
                hasVariant
                  ? `<div class="m-right-variant-text" style="font-size: 12px; color: rgba(var(--color-foreground), 0.65); margin-top: 2px;">${item.variant_title}</div>`
                  : ""
              }
              <div class="m-right-qty-stepper" data-line-key="${item.key}">
                <button type="button" class="m-right-qty-btn minus" data-ajax-qty-change="-1" data-key="${item.key}" aria-label="Decrease quantity">-</button>
                <span class="m-right-qty-val" data-qty-display>${item.quantity}</span>
                <button type="button" class="m-right-qty-btn plus" data-ajax-qty-change="1" data-key="${item.key}" aria-label="Increase quantity">+</button>
              </div>
              <div class="m-right-item-card__price-row" style="margin-top: 8px;">
                ${comparePriceFormatted}
                <span class="m-right-price-regular" data-line-price>${priceFormatted}</span>
              </div>
              <button type="button" class="m-right-remove-btn" data-ajax-remove-cart="${item.key}">
                ${window.MinimogStrings?.cartRemove || "Remove"}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    if (footer) {
      footer.classList.add("active");
      footer.classList.remove("m:hidden");
    }

    // Update Complete Your Collection Slider visibility & filter out in-cart items
    const collSection = document.getElementById("m-right-complete-collection");
    if (collSection) {
      collSection.classList.remove("m:hidden");
      const inCartIds = items.map((it) => it.product_id);
      let visibleCount = 0;
      document.querySelectorAll("#m-right-coll-slider-track .m-right-coll-card").forEach((card) => {
        const pid = parseInt(card.dataset.productId);
        if (inCartIds.includes(pid)) {
          card.style.display = "none";
        } else {
          card.style.display = "";
          visibleCount++;
        }
      });
      if (visibleCount === 0) {
        collSection.classList.add("m:hidden");
      }
    }
  }

  // =========================================================================
  // RIGHT DRAWER CONTROLLER
  // =========================================================================
  openRightDrawer(tabName = "search") {
    if (this.open) this.closeMenu();

    const rightDrawer = document.getElementById("m-right-utility-drawer") || document.querySelector(".m-luxury-right-drawer");
    if (rightDrawer) {
      document.documentElement.classList.add("prevent-scroll");
      rightDrawer.classList.add("open");
      rightDrawer.setAttribute("aria-hidden", "false");
      this.rightDrawerOpen = true;

      let targetTabId = "tab-btn-search";
      let targetPaneId = "#right-tab-search";

      const searchTabBtn = document.getElementById("tab-btn-search");

      if (tabName === "wishlist") {
        targetTabId = "tab-btn-wishlist";
        targetPaneId = "#right-tab-wishlist";
        if (searchTabBtn) searchTabBtn.style.display = "none";
        this.renderWishlistDrawerItems();
      } else if (tabName === "cart" || tabName === "bag") {
        targetTabId = "tab-btn-cart";
        targetPaneId = "#right-tab-cart";
        if (searchTabBtn) searchTabBtn.style.display = "none";
      } else if (tabName === "search") {
        if (searchTabBtn) searchTabBtn.style.display = "";
      }

      const targetTabBtn = document.getElementById(targetTabId);
      if (targetTabBtn) {
        this.switchRightDrawerTab(targetTabBtn, targetPaneId);
      }

      if (window.CurrencyEngine && typeof window.CurrencyEngine.ensurePriceSpacing === 'function') {
        window.CurrencyEngine.ensurePriceSpacing(rightDrawer);
      }

      if (tabName === "search") {
        setTimeout(() => {
          const input = rightDrawer.querySelector(".m-right-search-input");
          if (input) input.focus();
        }, 200);
      }
    }
  }

  closeRightDrawer() {
    const rightDrawer = document.getElementById("m-right-utility-drawer") || document.querySelector(".m-luxury-right-drawer");
    if (rightDrawer) {
      rightDrawer.classList.remove("open");
      rightDrawer.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("prevent-scroll");
      this.rightDrawerOpen = false;
    }
  }

  switchRightDrawerTab(tabBtn, targetSelector) {
    const rightDrawer = tabBtn.closest(".m-luxury-right-drawer") || document.getElementById("m-right-utility-drawer");
    if (!rightDrawer) return;

    rightDrawer.querySelectorAll(".m-luxury-right-drawer__tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tabBtn.classList.add("active");
    tabBtn.setAttribute("aria-selected", "true");

    rightDrawer.querySelectorAll(".m-luxury-right-drawer__pane").forEach((pane) => {
      pane.classList.remove("active");
    });
    const targetPane = rightDrawer.querySelector(targetSelector);
    if (targetPane) {
      targetPane.classList.add("active");
    }

    if (targetSelector === "#right-tab-wishlist") {
      this.renderWishlistDrawerItems();
    }

    const cartFooter = document.getElementById("m-right-cart-footer") || rightDrawer.querySelector(".m-luxury-right-drawer__footer");
    if (cartFooter) {
      const remainingCards = document.querySelectorAll("#m-cart-items-container .m-right-item-card");
      if (targetSelector === "#right-tab-cart" && remainingCards.length > 0) {
        cartFooter.classList.add("active");
        cartFooter.classList.remove("m:hidden");
      } else {
        cartFooter.classList.remove("active");
      }
    }
  }

  // =========================================================================
  // REAL SHOPIFY CART AJAX API
  // =========================================================================
  async updateShopifyCartItem(lineKey, newQuantity, cardEl) {
    try {
      if (cardEl && newQuantity > 0) cardEl.style.opacity = "0.7";

      const response = await fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: lineKey, quantity: newQuantity }),
      });

      const cart = await response.json();
      if (cart && cart.items) {
        this.renderCartItemsFromData(cart);
      } else {
        this.fetchCartAndRenderDrawer(false);
      }

      if (typeof MinimogEvents !== "undefined" && typeof MinimogTheme !== "undefined" && MinimogTheme.pubSubEvents) {
        MinimogEvents.emit(MinimogTheme.pubSubEvents.cartUpdate, cart);
      }
    } catch (error) {
      console.error("Cart update error:", error);
      if (cardEl) cardEl.style.opacity = "1";
    }
  }

  async addProductToShopifyCart(variantId, buttonEl) {
    if (!variantId) return;

    // Concurrency guard: prevent simultaneous duplicate add requests for the same variant
    this._addingVariants = this._addingVariants || new Set();
    if (this._addingVariants.has(variantId)) {
      return;
    }
    this._addingVariants.add(variantId);

    try {
      const originalText = buttonEl ? buttonEl.textContent : "";
      if (buttonEl) {
        buttonEl.textContent = window.MinimogStrings?.addedToBag || "Added to Bag ✓";
        buttonEl.style.color = "#16a34a";
        buttonEl.style.fontWeight = "600";
      }

      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: variantId, quantity: 1 }),
      });

      const item = await response.json();

      // Immediately fetch updated cart and render drawer without page reload
      await this.fetchCartAndRenderDrawer(true);

      if (buttonEl) {
        setTimeout(() => {
          buttonEl.textContent = originalText;
          buttonEl.style.color = "";
          buttonEl.style.fontWeight = "";
        }, 2000);
      }
    } catch (e) {
      console.error("Error adding to cart:", e);
    } finally {
      this._addingVariants.delete(variantId);
    }
  }

  // =========================================================================
  // REAL WISHLIST DYNAMIC CONTROLLER
  // =========================================================================
  getWishlistItems() {
    try {
      return JSON.parse(localStorage.getItem(this.wishlistStorageKey)) || [];
    } catch (e) {
      return [];
    }
  }

  saveWishlistItems(items) {
    try {
      const unique = Array.from(new Set(items));
      localStorage.setItem(this.wishlistStorageKey, JSON.stringify(unique));
      this.updateWishlistCount();
    } catch (e) {}
  }

  removeFromWishlist(handle) {
    const items = this.getWishlistItems().filter((h) => h !== handle);
    this.saveWishlistItems(items);
  }

  updateWishlistCount() {
    const count = this.getWishlistItems().length;
    document.querySelectorAll(".m-right-wishlist-count, .m-wishlist-count").forEach((el) => {
      el.textContent = count;
    });
  }

  async renderWishlistDrawerItems() {
    const container = document.getElementById("m-wishlist-items-container");
    if (!container) return;

    const handles = this.getWishlistItems();
    this.updateWishlistCount();

    const wishlistFooter = document.getElementById("m-right-wishlist-footer");

    if (handles.length === 0) {
      if (wishlistFooter) wishlistFooter.style.display = "none";
      const emptyWishlistText = window.MinimogStrings?.emptyWishlist || "Your wishlist is currently empty.";
      const discoverText = window.MinimogStrings?.discoverCollections || "Discover Collections";
      container.innerHTML = `
        <div class="m-right-drawer__empty-state" style="text-align: center; padding: 40px 0;">
          <p style="color: rgba(var(--color-foreground), 0.6); font-size: 13.5px; margin-bottom: 16px;">
            ${emptyWishlistText}
          </p>
          <a href="/collections/all" class="m-right-checkout-btn" style="text-decoration: none;">
            ${discoverText}
          </a>
        </div>
      `;
      return;
    }

    const loadingText = window.MinimogStrings?.loadingSavedItems || "Loading saved items...";
    if (wishlistFooter) wishlistFooter.style.display = "none";
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 0; color: rgba(var(--color-foreground), 0.6); font-size: 13px;">
        ${loadingText}
      </div>
    `;

    try {
      if (!window._LalehLocalizedPrices || Object.keys(window._LalehLocalizedPrices).length === 0) {
        try {
          const pRes = await fetch('/search/suggest.json?q=*&resources[type]=product&resources[limit]=10');
          if (pRes.ok) {
            const pData = await pRes.json();
            window._LalehLocalizedPrices = {};
            (pData?.resources?.results?.products || []).forEach((p) => {
              if (p.handle && p.price) {
                window._LalehLocalizedPrices[p.handle] = {
                  price: Math.round(parseFloat(p.price) * 100),
                  compare_at_price: p.compare_at_price ? Math.round(parseFloat(p.compare_at_price) * 100) : 0
                };
              }
            });
          }
        } catch (err) {}
      }

      const productPromises = handles.map(async (hdl) => {
        try {
          const res = await fetch(`/products/${hdl}.js`);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          return null;
        }
      });

      const products = (await Promise.all(productPromises)).filter(Boolean);

      if (products.length === 0) {
        if (wishlistFooter) wishlistFooter.style.display = "none";
        const emptyWishlistText = window.MinimogStrings?.emptyWishlist || "Your wishlist is currently empty.";
        const discoverText = window.MinimogStrings?.discoverCollections || "Discover Collections";
        container.innerHTML = `
          <div class="m-right-drawer__empty-state" style="text-align: center; padding: 40px 0;">
            <p style="color: rgba(var(--color-foreground), 0.6); font-size: 13.5px; margin-bottom: 16px;">
              ${emptyWishlistText}
            </p>
            <a href="/collections/all" class="m-right-checkout-btn" style="text-decoration: none;">
              ${discoverText}
            </a>
          </div>
        `;
        return;
      }

      function formatVariantName(title) {
        if (!title || title === "Default Title") return "";
        const trimmed = title.trim();
        if (/^size\s+/i.test(trimmed)) {
          return trimmed;
        }
        if (/^(\d+|[xXsSmlL0-9]+)$/i.test(trimmed) || !trimmed.includes("/")) {
          return `Size ${trimmed}`;
        }
        return trimmed;
      }

      container.innerHTML = products
        .map((prod) => {
          const imageSrc = prod.featured_image || (prod.images && prod.images[0]) || "";
          const firstVariant = (prod.variants && prod.variants[0]) || {};
          const wishTitle = getLalehOfficialTitle(prod.handle, prod.title);
          const hasVariants = prod.variants && (prod.variants.length > 1 || (firstVariant.title && firstVariant.title !== "Default Title"));

          let variantOptionsHtml = "";
          if (hasVariants) {
            const currentLabel = formatVariantName(firstVariant.title);
            variantOptionsHtml = `
              <div class="m-right-wishlist-variant-picker">
                <select class="m-right-wishlist-variant-select" aria-label="Select variant" data-variant-selector>
                  ${prod.variants
                    .map(
                      (v) => `
                    <option value="${v.id}" data-price="${v.price}" data-compare-price="${v.compare_at_price || 0}" data-label="${formatVariantName(v.title)}" ${v.id === firstVariant.id ? "selected" : ""}>
                      ${formatVariantName(v.title)}
                    </option>
                  `
                    )
                    .join("")}
                </select>
                <div class="m-right-wishlist-variant-display">
                  <span class="m-right-wishlist-variant-text" data-variant-display-text>${currentLabel}</span>
                  <svg class="m-right-wishlist-chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 1L5 5L9 1"></path>
                  </svg>
                </div>
              </div>
            `;
          }

          const loc = window._LalehLocalizedPrices && window._LalehLocalizedPrices[prod.handle];
          const finalPrice = loc && loc.price ? loc.price : (firstVariant.price || prod.price);
          const finalCompare = loc && loc.compare_at_price ? loc.compare_at_price : firstVariant.compare_at_price;
          const priceFormatted = formatMoney(finalPrice);
          const comparePriceFormatted =
            finalCompare > finalPrice
              ? `<span class="m-right-wishlist-price-compare" data-base-price="${finalCompare}">${formatMoney(finalCompare)}</span>`
              : "";

          return `
            <div class="m-right-wishlist-card" data-wishlist-handle="${prod.handle}">
              <a href="${prod.url || '#'}" class="m-right-wishlist-card__media">
                ${
                  imageSrc
                    ? `<img src="${imageSrc}" alt="${wishTitle}" loading="lazy">`
                    : `<div class="m-right-wishlist-card__placeholder"></div>`
                }
                <button
                  type="button"
                  class="m-right-wishlist-remove-icon"
                  data-wishlist-remove-handle="${prod.handle}"
                  aria-label="Remove from wishlist"
                  title="Remove"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </a>
              <div class="m-right-wishlist-card__details">
                <div class="m-right-wishlist-card__top">
                  <a href="${prod.url || '#'}" class="m-right-wishlist-card__title notranslate" translate="no">
                    ${wishTitle}
                  </a>
                  ${variantOptionsHtml}
                </div>
                <div class="m-right-wishlist-card__bottom">
                  <div class="m-right-wishlist-card__price-row">
                    ${comparePriceFormatted}
                    <span class="m-right-wishlist-price-regular" data-base-price="${finalPrice}">${priceFormatted}</span>
                  </div>
                  <button
                    type="button"
                    class="m-right-wishlist-add-btn"
                    data-wishlist-add-to-bag
                    data-wishlist-variant-id="${firstVariant.id || '1'}"
                  >
                    ${window.MinimogStrings?.addToBag || "Add to bag"}
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      if (wishlistFooter) {
        wishlistFooter.style.display = "block";
      }

      // Handle variant select changes
      container.querySelectorAll("[data-variant-selector]").forEach((select) => {
        select.addEventListener("change", (e) => {
          const opt = select.selectedOptions[0];
          const card = select.closest(".m-right-wishlist-card");
          if (!card || !opt) return;

          const labelEl = card.querySelector("[data-variant-display-text]");
          if (labelEl) {
            labelEl.textContent = opt.dataset.label || opt.textContent.trim();
          }

          const addBtn = card.querySelector("[data-wishlist-add-to-bag]");
          if (addBtn) {
            addBtn.dataset.wishlistVariantId = opt.value;
          }

          const price = parseInt(opt.dataset.price, 10);
          const comparePrice = parseInt(opt.dataset.comparePrice, 10);
          const priceRow = card.querySelector(".m-right-wishlist-card__price-row");
          if (priceRow && !isNaN(price)) {
            const compHtml = (comparePrice && comparePrice > price)
              ? `<span class="m-right-wishlist-price-compare">${formatMoney(comparePrice)}</span>`
              : "";
            priceRow.innerHTML = `${compHtml}<span class="m-right-wishlist-price-regular">${formatMoney(price)}</span>`;
          }
        });
      });
    } catch (e) {
      console.error("Wishlist render error:", e);
    }
  }

  // =========================================================================
  // REAL PREDICTIVE SEARCH DYNAMIC CONTROLLER
  // =========================================================================
  scoreAndFilterProducts(rawQuery, candidateList) {
    if (window._scoreAndFilterProducts) {
      return window._scoreAndFilterProducts(rawQuery, candidateList);
    }
    const q = (rawQuery || '').toLowerCase().trim().replace(/[«»"'`’‘.,;:!?#@$%^&*()_+=\-\[\]{}|\\/]/g, ' ').trim();
    if (!q || q.length < 2) return [];

    const typoMap = {
      'dross': 'dress', 'dres': 'dress', 'dresse': 'dress', 'drss': 'dress', 'drees': 'dress',
      'blck': 'black', 'balck': 'black', 'blak': 'black', 'gren': 'green', 'pnk': 'pink',
      'purpel': 'purple', 'beig': 'beige', 'robr': 'robe', 'noie': 'noir',
      'فستن': 'فستان', 'فستانن': 'فستان'
    };

    function normalizeAr(str) {
      return (str || '')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/[ى]/g, 'ي')
        .replace(/[ؤئ]/g, 'ء')
        .replace(/ة/g, 'ه');
    }

    const normQ = normalizeAr(q);
    const tokens = normQ.split(/\s+/).filter(Boolean).map((t) => typoMap[t] || t);
    const cleanQ = tokens.join(' ');

    const productAttributes = {
      'obsidian-touch': {
        colors: ['black', 'dark', 'jet black', 'onyx', 'noir', 'noire', 'noires', 'sombre', 'obsidienne', 'اسود', 'سوداء', 'سودا', 'داكن'],
        names: ['obsidian touch', 'obsidian', 'touch', 'toucher d obsidienne', 'obsidienne', 'اوبسيديان تاتش', 'اوبسيديان', 'تاتش', 'لمسة', 'لمسه'],
        uniqueKeywords: ['cocktail', 'cocktail dress', 'sleeveless', 'sans manches', 'بدون اكمام', 'بدون أكمام', 'كوكتيل']
      },
      'vermeil': {
        colors: ['green', 'pale green', 'sage', 'mint', 'emerald', 'pastel green', 'vert', 'verte', 'vertes', 'vert pale', 'sauge', 'menthe', 'emeraude', 'اخضر', 'خضراء', 'خضرا', 'ميرميه', 'ميرمية', 'نعناعي', 'زمرد', 'زمردي'],
        names: ['vermeil', 'فيرميل'],
        uniqueKeywords: ['tweed', 'robe en tweed', 'تويد', 'فستان تويد', 'flared cuffs', 'deux pieces', 'deux pièces', 'ensemble', 'قطعتين', 'أكمام واسعة', 'اكمام واسعة']
      },
      'crimson-poise': {
        colors: ['crimson', 'red', 'pink', 'rose', 'raspberry', 'cramoisi', 'rouge', 'rose', 'framboise', 'قرمزي', 'احمر', 'حمراء', 'حمرا', 'وردي', 'زهري'],
        names: ['crimson poise', 'crimson', 'poise', 'equilibre cramoisi', 'équilibre cramoisi', 'cramoisi', 'كرمسون بويز', 'كرمسون', 'بويز'],
        uniqueKeywords: ['peplum', 'بيبلوم', 'lace', 'dentelle', 'دانتيل', 'long sleeves', 'manches longues', 'أكمام طويلة', 'اكمام طويلة', 'party', 'fete', 'fête', 'حفلات']
      },
      'lilac-verse': {
        colors: ['lilac', 'lavender', 'purple', 'violet', 'soft purple', 'lilas', 'lavande', 'pourpre', 'ليلاك', 'لافندر', 'بنفسجي', 'ارجواني', 'أرجواني'],
        names: ['lilac verse', 'verse', 'vers lilas', 'ليلاك فيرس', 'فيرس'],
        uniqueKeywords: ['high collar', 'col montant', 'ياقة عالية', 'lace', 'dentelle', 'دانتيل', 'paisley', 'بيزلي', 'romantic', 'romantique', 'رومانسي']
      },
      'iris-pearl': {
        colors: ['pearl', 'pearls', 'mauve', 'soft mauve', 'sheen', 'perle', 'perles', 'بيرل', 'لؤلؤ', 'لؤلؤي', 'لولو', 'موف', 'موف ناعم'],
        names: ['iris pearl', 'iris', 'perle', 'ايريس بيرل', 'ايريس'],
        uniqueKeywords: ['satin', 'robe en satin', 'ساتان', 'فستان ساتان', 'puffed sleeves', 'manches bouffantes', 'أكمام منفوخة', 'اكمام منفوخة']
      },
      'structured-silence': {
        colors: ['sand', 'beige', 'sand-beige', 'tan', 'cream', 'taupe', 'neutral', 'sable', 'creme', 'crème', 'neutre', 'رملي', 'بيج', 'كريمي'],
        names: ['structured silence', 'structured', 'silence', 'silence structure', 'silence structuré', 'structure', 'ستركتشر سايلنس', 'ستركتشر', 'سايلنس', 'صمت', 'منظم'],
        uniqueKeywords: ['suit', 'skirt', 'pencil skirt', 'sharp lapels', 'costume', 'tailleur', 'jupe', 'jupe crayon', 'revers pointus', 'طقم', 'بدلة', 'بدله', 'تنورة', 'تنوره', 'تنورة قلم', 'ياقة حادة']
      }
    };

    const genericDressTerms = [
      'dress', 'dresses', 'gown', 'gowns', 'midi', 'evening', 'luxury',
      'robe', 'robes', 'soiree', 'soirée', 'luxe',
      'فستان', 'فساتين', 'ثوب', 'ميدي', 'سهرة', 'فاخر',
      'laleh', 'لاليه', 'لاله', 'collection', 'women', 'femme', 'نساء', 'نسائي'
    ].map((d) => normalizeAr(d.toLowerCase()));

    const foundQualifiersByProduct = {};
    let totalQualifiersFound = 0;

    for (const [handle, attrs] of Object.entries(productAttributes)) {
      foundQualifiersByProduct[handle] = [];
      const allSpecific = [
        ...attrs.colors.map((c) => normalizeAr(c.toLowerCase())),
        ...attrs.names.map((n) => normalizeAr(n.toLowerCase())),
        ...attrs.uniqueKeywords.map((u) => normalizeAr(u.toLowerCase()))
      ];

      for (const spec of allSpecific) {
        if (spec.includes(' ') && cleanQ.includes(spec)) {
          foundQualifiersByProduct[handle].push({ term: spec, weight: 10000 });
          totalQualifiersFound++;
        }
      }

      for (const tok of tokens) {
        if (tok.length < 2) continue;
        if (genericDressTerms.includes(tok)) continue;

        for (const spec of allSpecific) {
          if (spec === tok) {
            foundQualifiersByProduct[handle].push({ term: spec, weight: 8000 });
            totalQualifiersFound++;
            break;
          } else if (tok.length >= 4 && (spec.startsWith(tok) || tok.startsWith(spec))) {
            foundQualifiersByProduct[handle].push({ term: spec, weight: 4000 });
            totalQualifiersFound++;
            break;
          }
        }
      }
    }

    const isGenericQuery = tokens.some((t) => genericDressTerms.includes(t)) ||
                           genericDressTerms.some((d) => cleanQ.includes(d));

    const scored = [];

    for (const p of candidateList) {
      const handle = p.handle || (p.url ? p.url.split('/products/')[1]?.split('?')[0] : '');
      const qualifiers = foundQualifiersByProduct[handle] || [];
      let score = 0;

      for (const qf of qualifiers) {
        score += qf.weight;
      }

      if (totalQualifiersFound > 0) {
        if (qualifiers.length === 0) {
          score = 0;
        } else if (isGenericQuery) {
          score += 2000;
        }
      } else if (isGenericQuery) {
        score = 5000;
      }

      if (score > 0) {
        scored.push({ product: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topScore = scored[0].score;
      if (topScore >= 7000) {
        return scored.filter((item) => item.score >= topScore * 0.4).map((item) => item.product);
      }
    }

    return scored.map((item) => item.product);
  }

  scoreProduct(p, rawQuery) {
    const list = this.scoreAndFilterProducts(rawQuery, [p]);
    return list.length > 0 ? 1000 : 0;
  }

  parseSearchPriceToCents(val) {
    if (val == null) return 0;
    if (typeof val === 'number') {
      return val > 1000 ? Math.round(val) : Math.round(val * 100);
    }
    const clean = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(clean)) return 0;
    return Math.round(clean * 100);
  }

  initPredictiveSearch() {
    if (window._LalehPredictiveSearchActive) return;
    const searchInput = document.querySelector("[data-luxury-search-input]");
    if (!searchInput) return;

    if (searchInput._searchListenerAttached) return;
    searchInput._searchListenerAttached = true;

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);

      if (!query || query.length < 2) {
        const liveResults = document.getElementById("m-right-live-search-results");
        const defaultView = document.getElementById("m-right-search-default-view");
        if (liveResults) liveResults.style.display = "none";
        if (defaultView) defaultView.style.display = "block";
        return;
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.fetchPredictiveSearchResults(query);
      }, 150);
    });
  }

  async fetchPredictiveSearchResults(query) {
    const liveResults = document.getElementById("m-right-live-search-results");
    const defaultView = document.getElementById("m-right-search-default-view");
    const itemsList = document.getElementById("m-right-search-items-list");
    if (!liveResults || !itemsList) return;

    if (defaultView) defaultView.style.display = "none";
    liveResults.style.display = "block";
    const searchingText = window.MinimogStrings?.searchingStore || "Searching store...";
    itemsList.innerHTML = `<div style="text-align: center; padding: 20px 0; color: rgba(var(--color-foreground), 0.6); font-size: 13px;">${searchingText}</div>`;

    try {
      const suggestBase = window.MinimogSettings?.routes?.predictive_search_url || '/search/suggest.json';
      const searchUrl = `${suggestBase}?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last`;

      let products = [];
      try {
        const res = await fetch(searchUrl);
        if (res.ok) {
          const data = await res.json();
          products = data?.resources?.results?.products || [];
        }
      } catch (err) {
        console.warn("Suggest fetch warning:", err);
      }

      // Update global localized price cache for sitewide currency consistency
      if (!window._LalehLocalizedPrices) window._LalehLocalizedPrices = {};
      products.forEach((p) => {
        if (p.handle && p.price) {
          window._LalehLocalizedPrices[p.handle] = {
            price: this.parseSearchPriceToCents(p.price),
            compare_at_price: p.compare_at_price ? this.parseSearchPriceToCents(p.compare_at_price) : 0
          };
        }
      });

      // Combine suggest products and local catalog into candidate pool
      const candidateMap = new Map();
      (products || []).forEach((p) => {
        const h = p.handle || (p.url ? p.url.split('/products/')[1]?.split('?')[0] : '');
        if (h) candidateMap.set(h, p);
      });
      if (window._LalehCatalog && window._LalehCatalog.length > 0) {
        window._LalehCatalog.forEach((p) => {
          const h = p.handle || (p.url ? p.url.split('/products/')[1]?.split('?')[0] : '');
          if (h) {
            if (!candidateMap.has(h)) {
              candidateMap.set(h, p);
            } else {
              const existing = candidateMap.get(h);
              if (!existing.image && p.image) existing.image = p.image;
              if (!existing.url && p.url) existing.url = p.url;
            }
          }
        });
      }
      const candidatePool = Array.from(candidateMap.values());
      const scoredItems = this.scoreAndFilterProducts(query, candidatePool);

      if (scoredItems.length === 0) {
        const lang = (document.documentElement.lang || '').toLowerCase();
        const path = window.location.pathname;
        const isFr = lang.startsWith('fr') || path.startsWith('/fr');
        const isAr = lang.startsWith('ar') || path.startsWith('/ar');
        const safeQ = String(query || '').trim();

        let noFoundText = `No products found for "${safeQ}".`;
        if (isFr) {
          noFoundText = `Aucun produit trouvé pour « ${safeQ} ».`;
        } else if (isAr) {
          noFoundText = `لم يتم العثور على منتجات لـ "${safeQ}".`;
        }

        itemsList.innerHTML = `
          <div style="text-align: center; padding: 28px 12px; color: rgba(var(--color-foreground), 0.65); font-size: 13px; line-height: 1.5;">
            ${noFoundText}
          </div>
        `;
        return;
      }

      itemsList.innerHTML = scoredItems
        .map((p) => {
          const img = p.image || p.featured_image || "";
          const searchHandle = p.handle || (p.url ? p.url.split('/products/')[1]?.split('?')[0] : '');
          const searchTitle = getLalehOfficialTitle(searchHandle, p.title);
          const priceCents = this.parseSearchPriceToCents(p.price);
          const compPriceCents = p.compare_at_price ? this.parseSearchPriceToCents(p.compare_at_price) : 0;

          const priceFormatted = formatMoney(priceCents);
          const comparePriceFormatted =
            compPriceCents > priceCents
              ? `<span class="m-right-price-compare" data-base-price="${compPriceCents}">${formatMoney(compPriceCents)}</span>`
              : "";

          return `
            <div class="m-right-item-card" style="padding-bottom: 12px;">
              <a href="${p.url}" class="m-right-item-card__media" style="width: 70px; height: 90px;">
                ${img ? `<img src="${img}" alt="${searchTitle}" loading="lazy">` : `<div style="width:100%;height:100%;background:#f3f3f3;"></div>`}
              </a>
              <div class="m-right-item-card__details" style="justify-content: center;">
                <a href="${p.url}" class="m-right-item-card__title notranslate" translate="no" style="text-decoration: none; font-size: 13px; font-weight: 500; text-transform: uppercase;">
                  ${searchTitle}
                </a>
                <div class="m-right-item-card__price-row" style="margin-top: 4px;">
                  ${comparePriceFormatted}
                  <span class="m-right-price-regular" data-base-price="${priceCents}" style="font-size: 12.5px;">${priceFormatted}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      if (window.CurrencyEngine && typeof window.CurrencyEngine.ensurePriceSpacing === 'function') {
        window.CurrencyEngine.ensurePriceSpacing(itemsList);
      }
    } catch (e) {
      console.error("Predictive search error:", e);
      const isFr = document.documentElement.lang === "fr" || window.location.pathname.startsWith("/fr");
      const isAr = document.documentElement.lang === "ar" || window.location.pathname.startsWith("/ar");
      let msg = `No products found for "${query}".`;
      if (isFr) msg = `Aucun produit trouvé pour « ${query} ».`;
      else if (isAr) msg = `لم يتم العثور على منتجات لـ "${query}".`;
      itemsList.innerHTML = `<div style="text-align: center; padding: 28px 12px; color: rgba(var(--color-foreground), 0.65); font-size: 13px;">${msg}</div>`;
    }
  }

  // --- Left Drawer Methods ---
  openMenu() {
    if (this.rightDrawerOpen) this.closeRightDrawer();

    document.documentElement.classList.add("prevent-scroll");
    const drawer = document.getElementById("m-menu-drawer") || document.querySelector(".m-luxury-drawer");
    if (drawer) {
      drawer.classList.add("open");
    }
    const headerMobile = document.querySelector(".m-header__mobile");
    if (headerMobile) {
      headerMobile.classList.add("header-drawer-open");
    }
    const triggerButtons = document.querySelectorAll(this.selectors.hamburgerButtons);
    triggerButtons.forEach((btn) => btn.classList.add("active"));
    this.open = true;
  }

  closeMenu() {
    const drawer = document.getElementById("m-menu-drawer") || document.querySelector(".m-luxury-drawer");
    if (drawer) {
      drawer.classList.remove("open");
    }
    document.documentElement.classList.remove("prevent-scroll");
    const headerMobile = document.querySelector(".m-header__mobile");
    if (headerMobile) {
      headerMobile.classList.remove("header-drawer-open");
    }
    const triggerButtons = document.querySelectorAll(this.selectors.hamburgerButtons);
    triggerButtons.forEach((btn) => btn.classList.remove("active"));

    document.querySelectorAll(".m-luxury-drawer__submenu-panel").forEach((sub) => sub.classList.remove("open"));
    this.open = false;
  }

  openSubMenu(subMenuContainer, level) {
    let subMenuOpenClass = `m-submenu-open--level-${level}`;
    const menuDrawerContent = document.querySelector(".m-menu-drawer__content");
    const menu = document.querySelector(".m-menu-mobile");

    if (menuDrawerContent) menuDrawerContent.classList.add("open-submenu");
    if (menu) {
      menu.classList.add("m-submenu-open");
      menu.classList.add(subMenuOpenClass);
    }
    if (subMenuContainer) subMenuContainer.classList.add("open");
  }

  closeSubMenu(subMenuContainer, level) {
    let subMenuOpenClass = `m-submenu-open--level-${level}`;
    const menuDrawerContent = document.querySelector(".m-menu-drawer__content");
    const menu = document.querySelector(".m-menu-mobile");

    if (level === "1" && menu) menu.classList.remove("m-submenu-open");
    if (menu) menu.classList.remove(subMenuOpenClass);
    if (subMenuContainer) subMenuContainer.classList.remove("open");
    if (menuDrawerContent) menuDrawerContent.classList.remove("open-submenu");
  }

  initAccessibilityToggle() {
    const accToggle = document.getElementById("m-accessibility-toggle") || document.querySelector(".m-accessibility-input");
    if (accToggle) {
      try {
        const isAcc = localStorage.getItem("m-accessibility-mode") === "true";
        accToggle.checked = isAcc;
        if (isAcc) {
          document.body.classList.add("m-accessibility-mode");
        }
      } catch (e) {}

      accToggle.addEventListener("change", () => {
        if (accToggle.checked) {
          document.body.classList.add("m-accessibility-mode");
          try { localStorage.setItem("m-accessibility-mode", "true"); } catch (e) {}
        } else {
          document.body.classList.remove("m-accessibility-mode");
          try { localStorage.setItem("m-accessibility-mode", "false"); } catch (e) {}
        }
      });
    }
  }

  initDesktopMegaMenu() {
    if (!this.menuData || !this.menuData.length) return;
    this.menuData.forEach((menuItem) => {
      const { subMenu } = menuItem;
      if (subMenu) {
        const productsBanner = subMenu.querySelector(".m-mega-product-list");
        if (productsBanner) {
          if (window && window.__sfWindowLoaded) {
            menuItem.productsBannerSlider = this.initProductsBanner(productsBanner);
          } else {
            window.addEventListener("load", () => {
              menuItem.productsBannerSlider = this.initProductsBanner(productsBanner);
            });
          }
        }
      }
    });
  }

  closeDesktopSubmenu = (menuItemIndex) => {
    const menuItem = this.menuData[menuItemIndex];
    if (menuItem) {
      const { header } = menuItem;
      header && header.classList.remove("show-menu");
    }
  };

  initProductsBanner(banner) {
    const header = banner.closest("header");
    const menuItem = banner.closest(".m-menu__item");
    const screenClass = (header && `.${header.dataset.screen}`) || "";

    const id = banner.dataset.id;
    const sliderContainer = document.querySelector(`.m-product-list-${id}`);
    if (!sliderContainer) return null;
    const columns = sliderContainer.dataset.column;

    let slider;
    if (typeof MinimogLibs !== "undefined" && MinimogLibs.Swiper) {
      slider = new MinimogLibs.Swiper(`${screenClass} .m-product-list-${id}`, {
        slidesPerView: 1,
        loop: false,
        autoplay: false,
        breakpoints: {
          1200: { slidesPerView: columns },
          992: { slidesPerView: columns >= 2 ? 2 : columns },
        },
      });
      if (menuItem && menuItem.dataset.index) {
        this.sliders[menuItem.dataset.index] = slider;
      }
      return slider;
    }
    return null;
  }

  initMobileMegaMenu() {
    const menuItems = document.querySelectorAll(".m-menu-mobile__item");
    menuItems.forEach((item) => {
      const subMenuContainer = item.querySelector(".m-megamenu-mobile");
      const backBtn = item.querySelector(".m-menu-mobile__back-button");

      if (subMenuContainer && !backBtn) {
        if (typeof addEventDelegate === "function") {
          addEventDelegate({
            context: item,
            selector: "[data-toggle-submenu]",
            handler: (e, target) => {
              e.preventDefault();
              const level = target.dataset.toggleSubmenu;
              this.openSubMenu(subMenuContainer, level);
            },
          });
        }
      }

      if (backBtn && typeof addEventDelegate === "function") {
        addEventDelegate({
          context: item,
          selector: "[data-toggle-submenu]",
          handler: (e, target) => {
            e.preventDefault();
            const level = target.dataset.toggleSubmenu;
            const parentNode = e.target.parentNode;
            if (
              e.target.classList.contains("m-menu-mobile__back-button") ||
              parentNode.classList.contains("m-menu-mobile__back-button")
            ) {
              return;
            }

            this.openSubMenu(subMenuContainer, level);
          },
        });
        backBtn.addEventListener("click", (e) => {
          const level = e.target.dataset.level;
          this.closeSubMenu(subMenuContainer, level);
        });
      }
    });
  }
}

class SiteNav {
  constructor(container) {
    this.selectors = {
      menuItems: [".m-menu .m-menu__item"],
      dropdowns: [".m-mega-menu"],
      subMenu: ".m-mega-menu",
      overlay: ".m-header__overlay",
      swiper: ".swiper-container",
    };

    this.classes = {
      slideFromRight: "slide-from-right",
      slideReveal: "slide-reveal",
      active: "m-mega-active",
    };

    this.headerSticky = false;

    if (!container) return;
    this.container = container;
    this.domNodes = safeQueryDomNodes(this.selectors, this.container);
    this.activeIndex = -1;
    this.lastActiveIndex = -1;
    this.visited = false;
    this.timeoutEnter = null;
    this.timeoutLeave = null;
    this.attachEvents();
  }

  attachEvents = () => {
    if (!this.domNodes.menuItems) return;
    this.domNodes.menuItems.forEach((menuItem, index) => {
      menuItem.addEventListener("mouseenter", (evt) => this.onMenuItemEnter(evt, index));
      menuItem.addEventListener("mouseleave", (evt) => this.onMenuItemLeave(evt, index));
    });
  };

  initDropdownSize = () => {
    this.container && this.container.style.setProperty("--sf-dropdown-width", this.windowWidth() + "px");
    this.container && this.container.style.setProperty("--sf-dropdown-height", this.windowHeight() + "px");
  };

  windowWidth = () => window.innerWidth;
  windowHeight = () => window.innerHeight;

  onMenuItemEnter = (evt, index) => {
    const { target } = evt;
    if (!target.classList.contains("m-menu__item--mega")) return;
    this.initDropdownSize();
    this.activeIndex = index;
    if (this.timeoutLeave) clearTimeout(this.timeoutLeave);
    this.timeoutEnter = setTimeout(() => {
      this.container.classList.add(this.classes.active);
      target.classList.add("m-menu__item--active");
    }, 100);
  };

  onMenuItemLeave = (evt, index) => {
    const { target } = evt;
    if (!target.classList.contains("m-menu__item--mega")) return;
    if (this.timeoutEnter) clearTimeout(this.timeoutEnter);
    this.timeoutLeave = setTimeout(() => {
      this.container.classList.remove(this.classes.active);
      target.classList.remove("m-menu__item--active");
    }, 100);
  };
}

// Global Exports
if (typeof window !== "undefined") {
  window.Megamenu = Megamenu;
  window.SiteNav = SiteNav;

  const initMegamenuInstance = () => {
    if (!window.MinimogMegaMenu) {
      const headerEl = document.querySelector(".m-header") || document;
      window.MinimogMegaMenu = new Megamenu(headerEl);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMegamenuInstance);
  } else {
    initMegamenuInstance();
  }

  // LALEH Brand & Translation Guard for Arabic and French
  function applyLanguageTextGuards() {
    const isAr = document.documentElement.lang === "ar" || window.location.pathname.startsWith("/ar") || document.documentElement.dir === "rtl";
    const isFr = document.documentElement.lang === "fr" || window.location.pathname.startsWith("/fr");

    if (isAr) {
      // 0. FAQ "How can I contact LALEH?" & Answers RTL formatting fix
      const faqSection = document.querySelector(".m-faqs-section");
      if (faqSection) {
        faqSection.setAttribute("dir", "rtl");
      }
      const faqButtons = document.querySelectorAll(".m-faqs-section .m-collapsible--button > span:first-child, [data-block-id*='accordion_7fKgjR'] .m-collapsible--button > span:first-child");
      faqButtons.forEach((span) => {
        span.setAttribute("dir", "rtl");
        const btn = span.closest(".m-collapsible--button");
        if (btn) btn.setAttribute("dir", "rtl");
        const txt = (span.textContent || "").trim();
        if (
          span.closest("[data-block-id*='accordion_7fKgjR']") ||
          txt.includes("التواصل مع") ||
          txt.includes("الاتصال ب") ||
          /contact\s+laleh/i.test(txt) ||
          (txt.includes("كيف") && (txt.includes("LALEH") || txt.includes("لاله") || txt.includes("لالة")))
        ) {
          span.innerHTML = 'كيف يمكنني التواصل مع <span class="m-faq-brand-ltr" dir="ltr">LALEH</span>';
        }
      });

      // 0b. Announcement bar delivery message in Arabic: "التوصيل خلال 3 إلى 10 أيام عمل"
      const announceItems = document.querySelectorAll(".m-announcement-bar__desktop-item span, .m-announcement-bar__desktop-item a, .m-announcement-bar__slide span, .m-announcement-bar__slide a");
      announceItems.forEach((el) => {
        const txt = (el.textContent || "").trim();
        if (
          txt.includes("3–10") ||
          txt.includes("3-10") ||
          txt.includes("3—10") ||
          txt.includes("10–3") ||
          txt.includes("10-3") ||
          txt.includes("أيام عمل") ||
          /business\s+days/i.test(txt)
        ) {
          el.setAttribute("dir", "rtl");
          el.textContent = "التوصيل خلال 3 إلى 10 أيام عمل";
        }
      });

      // 0c. FAQ Answers: delivery numbers, return policy link, and email LTR isolation
      const faqAnswers = document.querySelectorAll(".m-faqs-section .m-collapsible--content__inner");
      faqAnswers.forEach((inner) => {
        inner.setAttribute("dir", "rtl");
        if (inner.innerHTML.includes("3—10") || inner.innerHTML.includes("3–10") || inner.innerHTML.includes("3-10") || inner.innerHTML.includes("10—3") || inner.innerHTML.includes("10–3")) {
          inner.innerHTML = inner.innerHTML.replace(/3[—–-]10|10[—–-]3/g, "3 إلى 10");
        }
        const policyLink = inner.querySelector("a[href*='refund-policy']");
        if (policyLink) {
          policyLink.classList.add("m-faq-policy-link");
        }
      });

      // 1. Brand name & Arabic typo guards (أداقة -> أناقة)
      const brandElements = document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6, .m-footer--block-title, .m-link, .m-menu__link, .m-luxury-drawer__nav-link, .m-breadcrumb--item, .m-breadcrumb--item-current, .m-richtext__title, .m-content-box__heading, p, span"
      );
      brandElements.forEach((el) => {
        if (el.children.length === 0 && el.textContent) {
          if (el.textContent.includes("لاله") || el.textContent.includes("لالة")) {
            el.innerHTML = el.innerHTML.replace(/لماذا\s+لال[هة]/g, 'لماذا <span dir="ltr">LALEH</span>')
                                       .replace(/امرأة\s+لال[هة]/g, 'امرأة <span dir="ltr">LALEH</span>')
                                       .replace(/اكتشفوا\s+لال[هة]/g, 'اكتشفوا <span dir="ltr">LALEH</span>')
                                       .replace(/لال[هة]/g, '<span dir="ltr">LALEH</span>');
          }
          if (el.textContent.includes("أداقة")) {
            el.innerHTML = el.innerHTML.replace(/أداقة/g, "أناقة");
          }
        }
      });

      // 2. Navigation & Drawer links: تسوقي المجموعة / تسوق المجموعة -> المجموعة
      const navElements = document.querySelectorAll(
        ".m-luxury-drawer__nav-link span, .m-luxury-drawer__back-btn span, .m-menu__link, .m-menu-mobile__item a"
      );
      navElements.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim();
          if (txt === "تسوقي المجموعة" || txt === "تسوق المجموعة" || txt === "تسوق الكل") {
            el.textContent = "المجموعة";
          }
        }
      });

      // 3. CTA Buttons: اكتشف التشكيلة -> اكتشفي المجموعة
      const btnElements = document.querySelectorAll(
        ".m-button, .m-btn, .button, a[class*='button'], .m-hero__button"
      );
      btnElements.forEach((el) => {
        if (el.textContent && (el.textContent.includes("اكتشف التشكيلة") || el.textContent.includes("اكتشف المجموعة"))) {
          el.textContent = el.textContent.replace(/اكتشف\s+(التشكيلة|المجموعة)/g, "اكتشفي المجموعة");
        }
      });

      // 4. Drawer Footer labels in Arabic
      const drawerLabels = document.querySelectorAll(".m-luxury-drawer__footer-label");
      drawerLabels.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim().toUpperCase();
          if (txt.includes("REGION") && txt.includes("CURRENCY")) {
            el.textContent = "البلد والعملة";
          }
          if (txt.includes("SOCIAL") && txt.includes("MEDIA")) {
            el.textContent = "وسائل التواصل الاجتماعي";
          }
        }
      });

      // 5. Sold out badges in Arabic: "Sold out" / "Out of stock" -> "نفدت الكمية"
      const arSoldOutBadges = document.querySelectorAll(
        ".m-product-tag--soldout, .m-product-tag, .m-price__badge-sold-out, [data-sold-out-badge], .m-product-card__tag-name"
      );
      arSoldOutBadges.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim().toLowerCase();
          if (txt === "sold out" || txt === "out of stock" || txt === "sold_out") {
            el.textContent = "نفدت الكمية";
          }
        }
      });

      // 6. Collection section heading & description in Arabic
      const colHeadings = document.querySelectorAll(".m-section__heading, h1, h2, h3");
      colHeadings.forEach((el) => {
        if (el.textContent && el.textContent.trim() === "The Collection") {
          el.textContent = "المجموعة";
        }
      });
      const colDescs = document.querySelectorAll(".m-section__description");
      colDescs.forEach((el) => {
        if (el.textContent && el.textContent.includes("Ready-to-wear defined by quiet sophistication")) {
          el.innerHTML = "<p>أزياء راقية صُممت بأناقة هادئة وتفاصيل مميزة.</p>";
        }
      });
    }

    if (isFr) {
      // 1. FAQ label & Breadcrumb "Maison" -> "Accueil"
      const faqElements = document.querySelectorAll(
        "h1, h2, h3, h4, .m-section__heading, .m-page-header__title, .m-breadcrumb--item-current, .m-breadcrumb--item, .m-link, .m-menu__link, .m-luxury-drawer__nav-link"
      );
      faqElements.forEach((el) => {
        if (el.textContent && /foire\s+aux\s+questions/i.test(el.textContent)) {
          el.innerHTML = el.innerHTML.replace(/foire\s+aux\s+questions/gi, "Questions fréquentes");
        }
        if (el.classList.contains("m-breadcrumb--item") && el.textContent && /^maison$/i.test(el.textContent.trim())) {
          el.textContent = "Accueil";
        }
      });
      if (document.title && /foire\s+aux\s+questions/i.test(document.title)) {
        document.title = document.title.replace(/foire\s+aux\s+questions/gi, "Questions fréquentes");
      }

      // 1b. French FAQ Accordion Question Refinements
      const frFaqSpans = document.querySelectorAll(".m-faqs-section .m-collapsible--button > span:first-child");
      frFaqSpans.forEach((span) => {
        const txt = (span.textContent || "").trim();
        if (
          span.closest("[data-block-id*='accordion-1']") ||
          /expédiez-vous\s+vos\s+produits/i.test(txt) ||
          /where\s+do\s+you\s+ship\s+from/i.test(txt)
        ) {
          span.textContent = "D'où sont expédiées vos commandes?";
        } else if (
          span.closest("[data-block-id*='accordion-2']") ||
          /combien\s+de\s+temps\s+prend\s+la\s+livraison/i.test(txt) ||
          /how\s+long\s+does\s+shipping\s+take/i.test(txt)
        ) {
          span.textContent = "Quels sont les délais de livraison?";
        } else if (
          span.closest("[data-block-id*='accordion-4']") ||
          /quelle\s+est\s+votre\s+politique\s+de\s+retour/i.test(txt) ||
          /what\s+is\s+your\s+return\s+policy/i.test(txt)
        ) {
          span.textContent = "Quelles sont les conditions de retour ?";
        }
      });

      // 2. Navigation & Drawer links in French
      const frNavElements = document.querySelectorAll(
        ".m-luxury-drawer__nav-link span, .m-luxury-drawer__back-btn span, .m-menu__link, .m-menu-mobile__item a"
      );
      frNavElements.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim();
          if (txt === "Tout voir" || txt === "tout voir") {
            el.textContent = "Voir toute la collection";
          } else if (txt === "Expédition et retours" || txt === "Expéditions et retours") {
            el.textContent = "Livraison et retours";
          }
        }
      });

      // 3. Drawer Footer labels in French
      const drawerLabels = document.querySelectorAll(".m-luxury-drawer__footer-label");
      drawerLabels.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim().toUpperCase();
          if (txt.includes("SOCIAL") && txt.includes("MEDIA")) {
            el.textContent = "RÉSEAUX SOCIAUX";
          }
          if (txt.includes("REGION") && txt.includes("CURRENCY")) {
            el.textContent = "PAYS ET DEVISE";
          }
        }
      });

      // 4. Unavailable products sold out badges in French: ÉPUISÉ -> RUPTURE DE STOCK
      const soldOutBadges = document.querySelectorAll(
        ".m-product-tag--soldout, .m-product-tag, .m-price__badge-sold-out, [data-sold-out-badge], .m-product-card__tag-name"
      );
      soldOutBadges.forEach((el) => {
        if (el.textContent) {
          const txt = el.textContent.trim();
          if (/^épuis[ée]?$/i.test(txt) || txt.toUpperCase() === "ÉPUISÉ" || txt.toUpperCase() === "ÉPUISE") {
            el.textContent = "RUPTURE DE STOCK";
          }
        }
      });

      // 5. Collection section heading & description in French
      const colHeadingsFr = document.querySelectorAll(".m-section__heading, h1, h2, h3");
      colHeadingsFr.forEach((el) => {
        if (el.textContent && el.textContent.trim() === "The Collection") {
          el.textContent = "La Collection";
        }
      });
      const colDescsFr = document.querySelectorAll(".m-section__description");
      colDescsFr.forEach((el) => {
        if (el.textContent && el.textContent.includes("Ready-to-wear defined by quiet sophistication")) {
          el.innerHTML = "<p>Du prêt-à-porter caractérisé par une élégance discrète et raffinée.</p>";
        }
      });

      // 6. Contact Form submit button in French: SOUMETTRE MAINTENANT -> ENVOYER LE MESSAGE
      const contactBtnsFr = document.querySelectorAll(
        ".m-contact-form__submit-btn, button[type='submit'], .m-button"
      );
      contactBtnsFr.forEach((btn) => {
        if (btn.textContent) {
          const txt = btn.textContent.trim().toUpperCase();
          if (txt === "SOUMETTRE MAINTENANT" || txt === "SOUMETTRE") {
            btn.textContent = "ENVOYER LE MESSAGE";
          }
        }
      });

      // 7. Clean up leaked prompt instructions and polish Shipping & Returns
      const leakedSnippets = [
        "keep the text slightly smaller on mobile",
        "avoid very long lines/large spacing",
        "reducing the text size on mobile",
        "instruction for you, not part of the website content",
        "réduire légèrement la taille du texte sur mobile",
        "espacements importants afin que la page soit plus épurée",
        "يرجى جعل النص أصغر قليلاً على الهاتف المحمول",
        "الأسطر الطويلة جداً أو التباعد الكبير",
        "تعليمات موجهة إليك"
      ];
      document.querySelectorAll(".m-page-content p, .shopify-policy__body p, .rte p, p").forEach((p) => {
        const text = (p.textContent || "").trim();
        for (let i = 0; i < leakedSnippets.length; i++) {
          if (text.includes(leakedSnippets[i])) {
            p.remove();
            break;
          }
        }
      });
    }

    // Always run leaked instructions cleanup and page text polishing
    const globalLeakedSnippets = [
      "keep the text slightly smaller on mobile",
      "avoid very long lines/large spacing",
      "reducing the text size on mobile",
      "instruction for you, not part of the website content",
      "réduire légèrement la taille du texte sur mobile",
      "espacements importants afin que la page soit plus épurée",
      "يرجى جعل النص أصغر قليلاً على الهاتف المحمول",
      "الأسطر الطويلة جداً أو التباعد الكبير",
      "تعليمات موجهة إليك"
    ];
    const subheadings = new Set([
      "SHIPPING", "RETURNS", "EXCHANGES",
      "EXPÉDITION", "RETOURS", "ÉCHANGES", "ECHANGES",
      "الشحن", "الإرجاع", "الاستبدال"
    ]);
    document.querySelectorAll(".m-page-content p, .shopify-policy__body p, .rte p, p").forEach((p) => {
      const text = (p.textContent || "").trim();
      for (let i = 0; i < globalLeakedSnippets.length; i++) {
        if (text.includes(globalLeakedSnippets[i])) {
          p.remove();
          return;
        }
      }
      if (subheadings.has(text)) {
        p.classList.add("m-page-subheading");
        if (text === "ECHANGES") p.textContent = "ÉCHANGES";
      }
    });

    // Client-side polish for French and Arabic Shipping & Returns
    document.querySelectorAll(".m-page-content, .shopify-policy__body, .rte").forEach((container) => {
      if (isFr) {
        container.querySelectorAll("h1, h2, h3, h4, p").forEach((el) => {
          let html = el.innerHTML;
          if (html.includes("Emirats arabes unis")) html = html.replace(/Emirats arabes unis/g, "Émirats arabes unis");
          if (html.includes("LALEH. si vous")) html = html.replace(/LALEH\.\s*si vous/g, "LALEH. Si vous");
          if (html.includes("satisfait (e)")) html = html.replace(/satisfait\s*\(e\)/g, "satisfait(e)");
          if (/^\s*ECHANGES\s*$/i.test(el.textContent.trim())) el.textContent = "ÉCHANGES";
          if (html.includes("Une fois votre article retourné reçu et inspecté")) html = html.replace(/Une fois votre article retourné reçu et inspecté/g, "Une fois votre retour reçu et inspecté");
          if (el.tagName === "P" && (html.includes("Les articles doivent être non portés") || html.includes("Toutes les étiquettes d'origine"))) {
            const ul = document.createElement("ul");
            ul.className = "m-page-bullet-list";
            ul.innerHTML = "<li>Les articles doivent être non portés, inutilisés et dans leur état d'origine.</li><li>Toutes les étiquettes d'origine doivent rester attachées.</li><li>Les articles doivent être retournés dans leur emballage d'origine dans la mesure du possible.</li>";
            el.replaceWith(ul);
            return;
          }
          el.innerHTML = html;
        });
      } else if (isAr) {
        container.setAttribute("dir", "rtl");
        container.querySelectorAll("h1, h2, h3, h4, p").forEach((el) => {
          el.setAttribute("dir", "rtl");
          let html = el.innerHTML;
          if (html.includes("بستعرق") || html.includes("يستعرق") || html.includes("بستغرق")) html = html.replace(/(بستعرق|يستعرق|بستغرق)/g, "يستغرق");
          if (html.includes("علق العميل") || html.includes("عائق العميل")) html = html.replace(/(علق العميل|عائق العميل)/g, "على عاتق العميل");
          if (html.includes("يتم إعداد جميع الطلبات") && html.includes("الإمارات العربية المتحدة")) {
            html = "يتم إعداد جميع الطلبات بعناية وشحنها من دولة الإمارات العربية المتحدة. يستغرق التوصيل عادةً من 3 إلى 10 أيام عمل، اعتماداً على الوجهة. بمجرد إرسال طلبكِ، ستتلقين بريداً إلكترونياً يحتوي على معلومات التتبع الخاصة بكِ.";
          }
          if (html.includes("نأمل أن تنال") && (html.includes("LALEH") || html.includes("لاله"))) {
            html = 'نأمل أن تنال قطعة <span class="m-brand-ltr" dir="ltr">LALEH</span> إعجابكِ. إذا لم تكوني راضيةً تماماً، يمكنكِ طلب إرجاع المنتج في غضون 14 يوماً من استلام طلبكِ.';
          }
          if (el.tagName === "P" && (html.includes("يجب أن تكون القطع غير ملبوسة") || html.includes("العلامات الأصلية مرفقة"))) {
            const ul = document.createElement("ul");
            ul.className = "m-page-bullet-list";
            ul.setAttribute("dir", "rtl");
            ul.innerHTML = "<li>يجب أن تكون القطع غير ملبوسة وغير مستخدمة وفي حالتها الأصلية.</li><li>يجب أن تظل جميع العلامات الأصلية مرفقة بالمنتج.</li><li>يجب إرجاع القطع في عبواتها الأصلية كلما أمكن ذلك.</li>";
            el.replaceWith(ul);
            return;
          }
          el.innerHTML = html;
        });
      } else {
        container.querySelectorAll("p").forEach((el) => {
          let html = el.innerHTML;
          if (html.includes("Items must be unworn") || html.includes("All original tags must remain attached")) {
            const ul = document.createElement("ul");
            ul.className = "m-page-bullet-list";
            ul.innerHTML = "<li>Items must be unworn, unused, and in their original condition.</li><li>All original tags must remain attached.</li><li>Items must be returned in their original packaging whenever possible.</li>";
            el.replaceWith(ul);
          }
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLanguageTextGuards);
  } else {
    applyLanguageTextGuards();
  }
}
