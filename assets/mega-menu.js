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
    .replace(/Dhs(\d)/gi, 'Dhs $1')
    .replace(/AED(\d)/gi, 'Dhs $1')
    .replace(/\s+/g, ' ')
    .trim();
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
        collSection.classList.add("m:hidden");
      }
      return;
    }

    container.innerHTML = items
      .map((item) => {
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
                  ? `<img src="${imgSrc}" alt="${item.product_title || item.title}" loading="lazy">`
                  : `<div style="width:100%;height:100%;background:#f3f3f3;"></div>`
              }
            </a>
            <div class="m-right-item-card__details">
              <a href="${item.url || '#'}" class="m-right-item-card__title" style="text-decoration: none;">
                ${item.product_title || item.title}
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

          const priceFormatted = formatMoney(firstVariant.price || prod.price);
          const comparePriceFormatted =
            firstVariant.compare_at_price > firstVariant.price
              ? `<span class="m-right-wishlist-price-compare">${formatMoney(firstVariant.compare_at_price)}</span>`
              : "";

          return `
            <div class="m-right-wishlist-card" data-wishlist-handle="${prod.handle}">
              <a href="${prod.url || '#'}" class="m-right-wishlist-card__media">
                ${
                  imageSrc
                    ? `<img src="${imageSrc}" alt="${prod.title}" loading="lazy">`
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
                  <a href="${prod.url || '#'}" class="m-right-wishlist-card__title">
                    ${prod.title}
                  </a>
                  ${variantOptionsHtml}
                </div>
                <div class="m-right-wishlist-card__bottom">
                  <div class="m-right-wishlist-card__price-row">
                    ${comparePriceFormatted}
                    <span class="m-right-wishlist-price-regular">${priceFormatted}</span>
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
  initPredictiveSearch() {
    const searchInput = document.querySelector("[data-luxury-search-input]");
    if (!searchInput) return;

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
      }, 250);
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
      const res = await fetch(
        `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last`
      );
      const data = await res.json();
      const products = data?.resources?.results?.products || [];

      if (products.length === 0) {
        const noFoundTemplate = window.MinimogStrings?.noProductsFound || 'No products found';
        const noFoundText = noFoundTemplate.replace('{{ query }}', query);
        itemsList.innerHTML = `
          <div style="text-align: center; padding: 24px 0; color: rgba(var(--color-foreground), 0.6); font-size: 13px;">
            ${noFoundText}
          </div>
        `;
        return;
      }

      itemsList.innerHTML = products
        .map((p) => {
          const img = p.image || p.featured_image || "";
          const price = formatMoney(p.price);
          const comparePrice = p.compare_at_price > p.price ? `<span class="m-right-price-compare">${formatMoney(p.compare_at_price)}</span>` : "";

          return `
            <div class="m-right-item-card" style="padding-bottom: 12px;">
              <a href="${p.url}" class="m-right-item-card__media" style="width: 70px; height: 90px;">
                ${img ? `<img src="${img}" alt="${p.title}" loading="lazy">` : `<div style="width:100%;height:100%;background:#f3f3f3;"></div>`}
              </a>
              <div class="m-right-item-card__details" style="justify-content: center;">
                <a href="${p.url}" class="m-right-item-card__title" style="text-decoration: none; font-size: 13px;">
                  ${p.title}
                </a>
                <div class="m-right-item-card__price-row" style="margin-top: 4px;">
                  ${comparePrice}
                  <span class="m-right-price-regular" style="font-size: 12.5px;">${price}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      console.error("Predictive search error:", e);
      itemsList.innerHTML = `<div style="text-align: center; padding: 20px 0; color: rgba(var(--color-foreground), 0.6); font-size: 13px;">Error fetching search results.</div>`;
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
}
