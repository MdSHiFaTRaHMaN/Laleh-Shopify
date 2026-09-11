/**
 * ELIE SAAB LUXURY PRODUCT DETAIL PAGE & QUICK VIEW CONTROLLER
 * Handles:
 * 1. Hero Gallery with Mouse-Drag, Touch-Swipe, Floating Next/Prev, Thumbnails Sync & Variant Media Sync
 * 2. Vertical & Horizontal Thumbnail Scrolling with Chevrons and Click Sync
 * 3. Interactive Size Guide Slide-in Panel with Unit Switcher (CM/IN) & Dynamic Spec Table
 * 4. International Sizing Standard Switcher (AU, FR, US, UK, IT)
 * 5. Full Variant Selection (Size & Color), Pricing, Availability & Add to Bag Sync
 * 6. Native Theme Wishlist & Cart Integration
 * 7. Smooth Collapsible Accordions & View More Expanded Tabs
 */

(function () {
  'use strict';

  // Sizing Spec Data Map in CM
  const SIZING_SPECS = {
    '34': { chest: 76, waist: 58, hip: 86, neck: 11.5, sleeve: 61 },
    '36': { chest: 80, waist: 62, hip: 90, neck: 11.75, sleeve: 62 },
    '38': { chest: 84, waist: 66, hip: 94, neck: 12.0, sleeve: 62.5 },
    '40': { chest: 88, waist: 70, hip: 98, neck: 12.25, sleeve: 63 },
    '42': { chest: 92, waist: 74, hip: 102, neck: 12.5, sleeve: 63.5 },
    '44': { chest: 96, waist: 78, hip: 106, neck: 12.75, sleeve: 64 },
    '46': { chest: 100, waist: 82, hip: 110, neck: 13.0, sleeve: 64.5 },
    '48': { chest: 104, waist: 86, hip: 114, neck: 13.25, sleeve: 65 },
    '50': { chest: 108, waist: 90, hip: 118, neck: 13.5, sleeve: 65.5 },
    '52': { chest: 112, waist: 94, hip: 122, neck: 13.75, sleeve: 66 },
    '6': { chest: 76, waist: 58, hip: 86, neck: 11.5, sleeve: 61 },
    '8': { chest: 80, waist: 62, hip: 90, neck: 11.75, sleeve: 62 },
    '10': { chest: 84, waist: 66, hip: 94, neck: 12.0, sleeve: 62.5 },
    '12': { chest: 88, waist: 70, hip: 98, neck: 12.25, sleeve: 63 },
    '14': { chest: 92, waist: 74, hip: 102, neck: 12.5, sleeve: 63.5 },
    '16': { chest: 96, waist: 78, hip: 106, neck: 12.75, sleeve: 64 },
    '18': { chest: 100, waist: 82, hip: 110, neck: 13.0, sleeve: 64.5 },
    '20': { chest: 104, waist: 86, hip: 114, neck: 13.25, sleeve: 65 },
    '2': { chest: 76, waist: 58, hip: 86, neck: 11.5, sleeve: 61 },
    '4': { chest: 80, waist: 62, hip: 90, neck: 11.75, sleeve: 62 },
    'XS': { chest: 78, waist: 60, hip: 88, neck: 11.5, sleeve: 61 },
    'S': { chest: 82, waist: 64, hip: 92, neck: 11.75, sleeve: 62 },
    'M': { chest: 88, waist: 70, hip: 98, neck: 12.25, sleeve: 63 },
    'L': { chest: 94, waist: 76, hip: 104, neck: 12.75, sleeve: 64 },
    'XL': { chest: 100, waist: 82, hip: 110, neck: 13.0, sleeve: 64.5 }
  };

  // International Sizing Conversions
  const SIZE_CONVERSIONS = {
    'AU': ['6', '8', '10', '12', '14', '16', '18', '20'],
    'UK': ['6', '8', '10', '12', '14', '16', '18', '20'],
    'FR': ['34', '36', '38', '40', '42', '44', '46', '48'],
    'IT': ['38', '40', '42', '44', '46', '48', '50', '52'],
    'US': ['2', '4', '6', '8', '10', '12', '14', '16']
  };

  class LuxuryProductController {
    constructor(container) {
      this.container = container || document;
      this.activeSize = '8';
      this.activeUnit = 'cm';
      this.currentSystem = 'AU';
      this.currentIndex = 0;

      this.loadProductData();
      this.initGallery();
      this.initSizeGuide();
      this.initMoreDetails();
      this.initAccordions();
      this.initVariantSelection();
    }

    loadProductData() {
      const jsonScript = this.container.querySelector('script[id^="LuxuryProductJson-"]');
      if (jsonScript) {
        try {
          this.productData = JSON.parse(jsonScript.textContent);
        } catch (e) {
          console.error('Error parsing product JSON:', e);
          this.productData = null;
        }
      }
    }

    /* ======================================================================
       1. HERO GALLERY SLIDER WITH DRAG, SWIPE, PREV/NEXT & THUMBNAILS
       ====================================================================== */
    initGallery() {
      const gallery = this.container.querySelector('.m-luxury-media-gallery');
      if (!gallery) return;

      const viewport = gallery.querySelector('.m-luxury-slider-viewport');
      const track = gallery.querySelector('.m-luxury-slider-track');
      const slides = gallery.querySelectorAll('.m-luxury-slide-item');
      const thumbs = this.container.querySelectorAll('.m-luxury-thumb-item');
      const prevBtn = gallery.querySelector('.m-luxury-nav-prev');
      const nextBtn = gallery.querySelector('.m-luxury-nav-next');
      const progressFill = gallery.querySelector('.m-luxury-progress-bar-fill');
      const thumbWrap = this.container.querySelector('.m-luxury-thumbnails-wrap');
      const thumbPrev = this.container.querySelector('.m-luxury-thumb-prev');
      const thumbNext = this.container.querySelector('.m-luxury-thumb-next');

      if (!viewport || !track || slides.length === 0) return;

      const totalSlides = slides.length;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;
      let animationID = 0;
      let currentIndex = 0;

      this.updateSlidePosition = (index, animate = true) => {
        if (index < 0) index = 0;
        if (index >= totalSlides) index = totalSlides - 1;
        currentIndex = index;
        this.currentIndex = index;

        const viewportWidth = viewport.offsetWidth || gallery.offsetWidth || (slides[0] ? slides[0].offsetWidth : 0);
        
        if (viewportWidth > 0) {
          currentTranslate = -currentIndex * viewportWidth;
          prevTranslate = currentTranslate;
          if (animate) {
            track.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          } else {
            track.style.transition = 'none';
          }
          track.style.transform = `translateX(${currentTranslate}px)`;
        } else {
          // Fallback to percentage transform if viewport width not yet rendered
          track.style.transition = animate ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
          track.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        // Update Slides is-active state
        slides.forEach((sl, i) => {
          if (i === currentIndex) {
            sl.classList.add('is-active');
          } else {
            sl.classList.remove('is-active');
          }
        });

        // Autoplay Video on Active Slide & Pause Others
        this.handleVideoPlayback(currentIndex);

        // Update Thumbnails
        thumbs.forEach((th, i) => {
          if (i === currentIndex) {
            th.classList.add('is-active');
            th.setAttribute('aria-selected', 'true');
            if (thumbWrap) {
              const isMobile = window.innerWidth <= 1023;
              if (isMobile) {
                const thLeft = th.offsetLeft - thumbWrap.offsetLeft;
                thumbWrap.scrollTo({ left: thLeft - 20, behavior: 'smooth' });
              } else {
                const thTop = th.offsetTop - thumbWrap.offsetTop;
                thumbWrap.scrollTo({ top: thTop - 40, behavior: 'smooth' });
              }
            }
          } else {
            th.classList.remove('is-active');
            th.setAttribute('aria-selected', 'false');
          }
        });

        // Update Progress Bar
        if (progressFill) {
          const stepPercent = 100 / totalSlides;
          progressFill.style.width = `${stepPercent}%`;
          progressFill.style.transform = `translateX(${currentIndex * 100}%)`;
        }
      };

      this.handleVideoPlayback = (activeIndex) => {
        slides.forEach((slide, idx) => {
          const video = slide.querySelector('video');
          const iframe = slide.querySelector('iframe');

          if (idx === activeIndex) {
            if (video) {
              video.muted = true;
              video.playsInline = true;
              video.loop = true;
              video.setAttribute('playsinline', '');
              video.setAttribute('webkit-playsinline', '');
              video.setAttribute('muted', '');
              
              // Ensure video is played
              try {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                  playPromise.catch((err) => {
                    console.log('Autoplay prevented or waiting for interaction:', err);
                  });
                }
              } catch (err) {
                console.log('Video play error:', err);
              }
            } else if (iframe && iframe.contentWindow) {
              try {
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                iframe.contentWindow.postMessage('{"method":"play"}', '*');
              } catch (e) {}
            }
          } else {
            if (video) {
              try {
                video.pause();
                video.currentTime = 0;
              } catch (e) {}
            } else if (iframe && iframe.contentWindow) {
              try {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                iframe.contentWindow.postMessage('{"method":"pause"}', '*');
              } catch (e) {}
            }
          }
        });
      };

      // Prev / Next Button Clicks
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.updateSlidePosition(currentIndex - 1);
        };
      }

      if (nextBtn) {
        nextBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.updateSlidePosition(currentIndex + 1);
        };
      }

      // Thumbnail Scrolling Chevrons
      if (thumbPrev && thumbWrap) {
        thumbPrev.onclick = (e) => {
          e.preventDefault();
          thumbWrap.scrollBy({ top: -140, behavior: 'smooth' });
        };
      }
      if (thumbNext && thumbWrap) {
        thumbNext.onclick = (e) => {
          e.preventDefault();
          thumbWrap.scrollBy({ top: 140, behavior: 'smooth' });
        };
      }

      // Thumbnail clicks
      thumbs.forEach((thumb) => {
        thumb.onclick = (e) => {
          e.preventDefault();
          const targetIndex = parseInt(thumb.getAttribute('data-index'), 10) || 0;
          this.updateSlidePosition(targetIndex);
        };
      });

      // --- Cursor Mouse Drag & Touch Swipe Engine ---
      const getPositionX = (e) => {
        return e.type.includes('mouse') ? e.pageX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      };

      const getPositionY = (e) => {
        return e.type.includes('mouse') ? e.pageY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      };

      const dragStart = (e) => {
        if (e.target.closest('.m-luxury-nav-btn')) return;
        isDragging = true;
        startX = getPositionX(e);
        startY = getPositionY(e);
        viewport.classList.add('is-dragging');
        track.style.transition = 'none';
        animationID = requestAnimationFrame(animation);
      };

      const dragMove = (e) => {
        if (!isDragging) return;
        const currentX = getPositionX(e);
        const currentY = getPositionY(e);
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // If user is clearly scrolling vertically, don't hijack horizontal translate
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffX) < 10) {
          return;
        }

        currentTranslate = prevTranslate + diffX;
      };

      const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        cancelAnimationFrame(animationID);
        viewport.classList.remove('is-dragging');

        const movedBy = currentTranslate - prevTranslate;
        const threshold = 40;

        if (movedBy < -threshold && currentIndex < totalSlides - 1) {
          currentIndex += 1;
        } else if (movedBy > threshold && currentIndex > 0) {
          currentIndex -= 1;
        }

        this.updateSlidePosition(currentIndex);
      };

      const animation = () => {
        track.style.transform = `translateX(${currentTranslate}px)`;
        if (isDragging) requestAnimationFrame(animation);
      };

      // Mouse Events
      viewport.addEventListener('mousedown', dragStart);
      window.addEventListener('mousemove', dragMove);
      window.addEventListener('mouseup', dragEnd);

      // Touch Events
      viewport.addEventListener('touchstart', dragStart, { passive: true });
      viewport.addEventListener('touchmove', dragMove, { passive: true });
      viewport.addEventListener('touchend', dragEnd);

      // Window Resize Listener
      window.addEventListener('resize', () => {
        this.updateSlidePosition(currentIndex, false);
      });

      // Recalculate once DOM is fully painted
      setTimeout(() => {
        this.updateSlidePosition(0, false);
      }, 100);
      setTimeout(() => {
        this.updateSlidePosition(0, false);
      }, 300);
    }

    /* ======================================================================
       2. INTERACTIVE SIZE GUIDE PANEL, UNIT SWITCHER & SPEC TABLE
       ====================================================================== */
    initSizeGuide() {
      const detailsView = this.container.querySelector('.m-luxury-product-details-view');
      const sizeGuidePanel = this.container.querySelector('#m-luxury-size-guide-panel');
      const openTriggers = this.container.querySelectorAll('[data-open-sizeguide], .m-luxury-size-guide-trigger-btn');
      const closeTriggers = this.container.querySelectorAll('[data-close-sizeguide], .m-luxury-sg-back-btn, .m-luxury-sg-return-btn');
      
      const unitBtns = this.container.querySelectorAll('.m-luxury-sg-unit-btn');
      const sizeHeaders = this.container.querySelectorAll('.m-luxury-sg-th-size');
      const measureItems = this.container.querySelectorAll('.m-luxury-sg-measure-item');
      const tableRows = this.container.querySelectorAll('.m-luxury-sg-row');

      if (!sizeGuidePanel) return;

      const openSizeGuide = (e) => {
        if (e) e.preventDefault();
        if (detailsView) {
          detailsView.classList.remove('is-visible');
          detailsView.classList.add('is-hidden');
        }
        const moreDetailsPanel = this.container.querySelector('#m-luxury-more-details-panel');
        if (moreDetailsPanel) {
          moreDetailsPanel.classList.remove('is-visible');
          moreDetailsPanel.setAttribute('aria-hidden', 'true');
        }
        sizeGuidePanel.classList.remove('is-hidden');
        sizeGuidePanel.classList.add('is-visible');
        sizeGuidePanel.setAttribute('aria-hidden', 'false');

        // Sync currently active size on open
        this.highlightActiveSizeColumn();
        this.scrollToColumnTop();
      };

      const closeSizeGuide = (e) => {
        if (e) e.preventDefault();
        sizeGuidePanel.classList.remove('is-visible');
        sizeGuidePanel.classList.add('is-hidden');
        sizeGuidePanel.setAttribute('aria-hidden', 'true');
        if (detailsView) {
          detailsView.classList.remove('is-hidden');
          detailsView.classList.add('is-visible');
        }
        this.scrollToColumnTop();
      };

      openTriggers.forEach((btn) => {
        btn.onclick = openSizeGuide;
      });
      closeTriggers.forEach((btn) => {
        btn.onclick = closeSizeGuide;
      });

      // Unit Toggle (CM / IN) with dynamic table conversion
      unitBtns.forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          unitBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeUnit = btn.getAttribute('data-unit') || 'cm';
          this.updateSizeGuideUnits();
        };
      });

      // Size column header clicks -> highlight & sync with product variant
      sizeHeaders.forEach((th) => {
        th.onclick = (e) => {
          e.preventDefault();
          const size = th.getAttribute('data-size');
          if (size) {
            this.highlightSizeColumn(size);
            this.syncMainProductSize(size);
          }
        };
      });

      // Hover sync: Guide item <-> Table row
      measureItems.forEach((item) => {
        const param = item.getAttribute('data-param');
        if (!param) return;

        item.addEventListener('mouseenter', () => {
          const row = this.container.querySelector(`.m-luxury-sg-row[data-param="${param}"]`);
          if (row) row.classList.add('is-highlighted');
        });

        item.addEventListener('mouseleave', () => {
          const row = this.container.querySelector(`.m-luxury-sg-row[data-param="${param}"]`);
          if (row) row.classList.remove('is-highlighted');
        });
      });

      tableRows.forEach((row) => {
        const param = row.getAttribute('data-param');
        if (!param) return;

        row.addEventListener('mouseenter', () => {
          const item = this.container.querySelector(`.m-luxury-sg-measure-item[data-param="${param}"]`);
          if (item) item.classList.add('is-hovered');
        });

        row.addEventListener('mouseleave', () => {
          const item = this.container.querySelector(`.m-luxury-sg-measure-item[data-param="${param}"]`);
          if (item) item.classList.remove('is-hovered');
        });
      });

      // Initial unit & table state setup
      this.updateSizeGuideUnits();
      this.highlightActiveSizeColumn();
    }

    updateSizeGuideUnits() {
      const isInch = this.activeUnit === 'in';
      const unitLabel = isInch ? 'IN' : 'CM';

      // Update unit labels in headers
      const unitLabels = this.container.querySelectorAll('.m-luxury-sg-unit-label');
      unitLabels.forEach((el) => {
        el.textContent = unitLabel;
      });

      // Update note
      const noteEl = this.container.querySelector('.m-luxury-sg-note');
      if (noteEl) {
        const noteCm = noteEl.getAttribute('data-note-cm') || 'All measurements are in centimeters.';
        const noteIn = noteEl.getAttribute('data-note-in') || 'All measurements are in inches.';
        noteEl.textContent = isInch ? noteIn : noteCm;
      }

      // Convert table values
      const valCells = this.container.querySelectorAll('.m-luxury-sg-td-val');
      valCells.forEach((td) => {
        const rawCm = parseFloat(td.getAttribute('data-raw-cm'));
        if (!isNaN(rawCm)) {
          if (isInch) {
            const inVal = rawCm / 2.54;
            td.textContent = (Math.round(inVal * 10) / 10).toFixed(1);
          } else {
            td.textContent = rawCm;
          }
        }
      });
    }

    highlightSizeColumn(size) {
      const sizeHeaders = this.container.querySelectorAll('.m-luxury-sg-th-size');
      const valCells = this.container.querySelectorAll('.m-luxury-sg-td-val');

      sizeHeaders.forEach((th) => {
        if (th.getAttribute('data-size') === size) {
          th.classList.add('is-active');
        } else {
          th.classList.remove('is-active');
        }
      });

      valCells.forEach((td) => {
        if (td.getAttribute('data-size') === size) {
          td.classList.add('is-col-active');
        } else {
          td.classList.remove('is-col-active');
        }
      });
    }

    highlightActiveSizeColumn() {
      const activeSizeBox = this.container.querySelector('.m-luxury-sizes-grid .m-luxury-size-box.active');
      if (activeSizeBox) {
        const size = activeSizeBox.getAttribute('data-value') || activeSizeBox.textContent.trim();
        if (size) {
          this.highlightSizeColumn(size);
        }
      }
    }

    syncMainProductSize(size) {
      const mainSizeBoxes = this.container.querySelectorAll('.m-luxury-sizes-grid .m-luxury-size-box');
      mainSizeBoxes.forEach((box) => {
        const val = box.getAttribute('data-value') || box.textContent.trim();
        if (val.toLowerCase() === size.toLowerCase()) {
          box.click();
        }
      });
    }

    /* ======================================================================
       3. VARIANT SELECTION (SIZE & COLOR), PRICE & FORM UPDATE
       ====================================================================== */
    initVariantSelection() {
      const sizeBoxes = this.container.querySelectorAll('.m-luxury-sizes-grid .m-luxury-size-box');
      const colorSwatches = this.container.querySelectorAll('.m-luxury-color-swatch-box');
      const hiddenVariantInput = this.container.querySelector('.m-product-form input[name="id"]');
      const atcButton = this.container.querySelector('.m-luxury-add-to-bag-btn');
      const atcText = atcButton ? atcButton.querySelector('.m-add-to-cart--text') : null;
      const priceRow = this.container.querySelector('.m-luxury-product-price-row');
      const selectedColorLabel = this.container.querySelector('.m-luxury-selected-color-name');

      let selectedSize = '';
      let selectedColor = '';

      const activeSizeBox = this.container.querySelector('.m-luxury-sizes-grid .m-luxury-size-box.active');
      if (activeSizeBox) selectedSize = activeSizeBox.getAttribute('data-value') || activeSizeBox.textContent.trim();

      const activeColorSwatch = this.container.querySelector('.m-luxury-color-swatch-box.active');
      if (activeColorSwatch) selectedColor = activeColorSwatch.getAttribute('data-value') || '';

      const updateVariantState = () => {
        if (!this.productData || !this.productData.variants) return;

        // Find matching variant
        let matchedVariant = null;
        for (const variant of this.productData.variants) {
          let matches = true;
          if (selectedSize && !variant.options.includes(selectedSize)) matches = false;
          if (selectedColor && !variant.options.includes(selectedColor)) matches = false;
          if (matches) {
            matchedVariant = variant;
            break;
          }
        }

        if (!matchedVariant && this.productData.variants.length > 0) {
          matchedVariant = this.productData.variants[0];
        }

        if (matchedVariant) {
          // Update hidden ID input
          if (hiddenVariantInput) {
            hiddenVariantInput.value = matchedVariant.id;
          }

          // Update Add to Bag Button
          if (atcButton && atcText) {
            if (matchedVariant.available) {
              atcButton.removeAttribute('disabled');
              atcText.textContent = atcButton.getAttribute('data-atc-text') || window.MinimogStrings?.addToBag || 'Add to Bag';
            } else {
              atcButton.setAttribute('disabled', 'disabled');
              atcText.textContent = atcButton.getAttribute('data-soldout-text') || window.MinimogStrings?.soldOut || 'Out of Stock';
            }
          }

          // Update Price
          if (priceRow) {
            const formattedPrice = this.formatMoney(matchedVariant.price);
            if (matchedVariant.compare_at_price && matchedVariant.compare_at_price > matchedVariant.price) {
              const formattedCompare = this.formatMoney(matchedVariant.compare_at_price);
              priceRow.innerHTML = `
                <span class="m-luxury-product-price m-luxury-product-price--sale">${formattedPrice}</span>
                <s class="m-luxury-product-price--compare" style="margin-left: 8px; color: #a1a1aa; font-size: 14px;">${formattedCompare}</s>
              `;
            } else {
              priceRow.innerHTML = `<span class="m-luxury-product-price">${formattedPrice}</span>`;
            }
          }

          // Move slider to variant featured media if exists
          if (matchedVariant.featured_media && matchedVariant.featured_media.id) {
            const slideWithMedia = this.container.querySelector(`.m-luxury-slide-item[data-media-id="${matchedVariant.featured_media.id}"]`);
            if (slideWithMedia && this.updateSlidePosition) {
              const index = parseInt(slideWithMedia.getAttribute('data-index'), 10);
              if (!isNaN(index)) {
                this.updateSlidePosition(index);
              }
            }
          }
        }
      };

      // Size Button clicks
      sizeBoxes.forEach((box) => {
        box.onclick = (e) => {
          e.preventDefault();
          sizeBoxes.forEach((b) => b.classList.remove('active'));
          box.classList.add('active');
          selectedSize = box.getAttribute('data-value') || box.textContent.trim();
          this.activeSize = box.getAttribute('data-original-value') || selectedSize;
          this.updateSpecTable();
          updateVariantState();
        };
      });

      // Color Swatch clicks
      colorSwatches.forEach((swatch) => {
        swatch.onclick = (e) => {
          e.preventDefault();
          colorSwatches.forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
          selectedColor = swatch.getAttribute('data-value') || '';
          if (selectedColorLabel) selectedColorLabel.textContent = selectedColor;
          updateVariantState();
        };
      });
    }

    formatMoney(cents) {
      if (window.CurrencyEngine && typeof window.CurrencyEngine.formatMoney === 'function') {
        return window.CurrencyEngine.formatMoney(cents, window.CurrencyEngine.getActiveCurrency());
      }
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        return Shopify.formatMoney(cents, window.MinimogSettings?.money_format || 'Dhs {{amount}}');
      }
      return 'Dhs ' + (cents / 100).toFixed(2);
    }

    /* ======================================================================
       4. ACCORDIONS COLLAPSIBLE (Only one open at a time)
       ====================================================================== */
    initAccordions() {
      const accordions = this.container.querySelectorAll('.m-luxury-accordion-item');

      // Ensure only the first active accordion stays open on load
      let hasOpenAccordion = false;
      accordions.forEach((acc) => {
        if (acc.classList.contains('is-open')) {
          if (!hasOpenAccordion) {
            hasOpenAccordion = true;
          } else {
            acc.classList.remove('is-open');
            const h = acc.querySelector('.m-luxury-accordion-header');
            if (h) h.setAttribute('aria-expanded', 'false');
          }
        }
      });

      // Helper to strip any trailing ellipsis from preview text in all accordion sections
      const cleanTrailingEllipsis = () => {
        accordions.forEach((acc) => {
          const content = acc.querySelector('.m-luxury-accordion-content');
          if (!content) return;
          const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
          let lastNode = null;
          while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.trim().length > 0) {
              lastNode = walker.currentNode;
            }
          }
          if (lastNode && lastNode.nodeValue) {
            lastNode.nodeValue = lastNode.nodeValue.replace(/(\s*[\.…]{2,}|\s*…)+$/g, '');
          }
        });
      };
      cleanTrailingEllipsis();

      // Helper to remove "View more" if there is no additional text to display (especially Product Care)
      const checkViewMoreButton = (acc) => {
        const header = acc.querySelector('.m-luxury-accordion-header');
        const headerText = (header ? header.textContent : '').toLowerCase();
        const truncated = acc.querySelector('.m-luxury-accordion-truncated');
        const viewMoreBtn = acc.querySelector('.m-luxury-view-more-btn');
        if (!viewMoreBtn) return;

        if (headerText.includes('care')) {
          const content = acc.querySelector('.m-luxury-accordion-content');
          const text = (content ? content.innerText : '').trim();
          // If Product Care content is short or doesn't overflow preview
          if (!truncated || text.length < 200 || (truncated.clientHeight > 0 && truncated.scrollHeight <= truncated.clientHeight + 6)) {
            viewMoreBtn.style.display = 'none';
            if (truncated) truncated.classList.add('is-expanded');
          }
        } else if (truncated && truncated.clientHeight > 0) {
          if (truncated.scrollHeight <= truncated.clientHeight + 6) {
            viewMoreBtn.style.display = 'none';
          }
        }
      };

      accordions.forEach(checkViewMoreButton);

      accordions.forEach((acc) => {
        const header = acc.querySelector('.m-luxury-accordion-header');
        if (header) {
          header.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !acc.classList.contains('is-open');

            // Close all other accordions so only one is open at a time
            accordions.forEach((otherAcc) => {
              if (otherAcc !== acc) {
                otherAcc.classList.remove('is-open');
                const otherHeader = otherAcc.querySelector('.m-luxury-accordion-header');
                if (otherHeader) {
                  otherHeader.setAttribute('aria-expanded', 'false');
                }
              }
            });

            // Toggle target accordion
            acc.classList.toggle('is-open', willOpen);
            header.setAttribute('aria-expanded', willOpen.toString());

            if (willOpen) {
              setTimeout(() => {
                checkViewMoreButton(acc);
                cleanTrailingEllipsis();
              }, 100);
            }
          };
        }
      });
    }

    /* ======================================================================
       5. EXPANDED TABS DETAILS PANEL (View More)
       ====================================================================== */
    initMoreDetails() {
      const detailsView = this.container.querySelector('.m-luxury-product-details-view');
      const moreDetailsPanel = this.container.querySelector('#m-luxury-more-details-panel');
      const openTriggers = this.container.querySelectorAll('[data-open-moredetails], .m-luxury-view-more-btn');
      const closeTriggers = this.container.querySelectorAll('[data-close-moredetails], .m-luxury-more-return-btn');
      const tabBtns = this.container.querySelectorAll('.m-luxury-more-tab-btn');
      const tabPanes = this.container.querySelectorAll('.m-luxury-more-tab-pane');

      if (!moreDetailsPanel) return;

      const openMoreDetails = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        // On mobile / tablet (<= 1023px): Keep as accordion sections, do NOT switch to horizontal tabs!
        if (window.innerWidth <= 1023) {
          const btn = e && e.currentTarget;
          const accordionContent = btn && btn.closest('.m-luxury-accordion-content');
          if (accordionContent) {
            const truncated = accordionContent.querySelector('.m-luxury-accordion-truncated');
            if (truncated) {
              const isExpanded = truncated.classList.contains('is-expanded');
              truncated.classList.toggle('is-expanded', !isExpanded);
              btn.textContent = !isExpanded ? 'View less' : (btn.getAttribute('data-view-more-text') || 'View more');
            }
          }
          return;
        }

        const targetTab = (e && e.currentTarget && e.currentTarget.getAttribute('data-open-moredetails')) || '';

        if (detailsView) {
          detailsView.classList.remove('is-visible');
          detailsView.classList.add('is-hidden');
        }
        const sizeGuidePanel = this.container.querySelector('#m-luxury-size-guide-panel');
        if (sizeGuidePanel) {
          sizeGuidePanel.classList.remove('is-visible');
          sizeGuidePanel.classList.add('is-hidden');
          sizeGuidePanel.setAttribute('aria-hidden', 'true');
        }
        moreDetailsPanel.classList.remove('is-hidden');
        moreDetailsPanel.classList.add('is-visible');
        moreDetailsPanel.setAttribute('aria-hidden', 'false');

        // Activate the target tab
        let matchedIndex = -1;
        tabBtns.forEach((b, index) => {
          const tabId = b.getAttribute('data-tab') || '';
          const tabHeading = b.getAttribute('data-tab-heading') || '';
          const isMatch = (targetTab && (tabId === targetTab || (tabHeading && tabHeading.includes(targetTab.toLowerCase()))));
          if (isMatch && matchedIndex === -1) {
            matchedIndex = index;
          }
        });

        if (matchedIndex === -1 && tabBtns.length > 0) matchedIndex = 0;

        tabBtns.forEach((b, index) => {
          const isTarget = index === matchedIndex;
          b.classList.toggle('active', isTarget);
          b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });

        tabPanes.forEach((pane, index) => {
          pane.classList.toggle('active', index === matchedIndex);
        });

        // Smooth scroll to the top of the product info column
        this.scrollToColumnTop();
      };

      const closeMoreDetails = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        moreDetailsPanel.classList.remove('is-visible');
        moreDetailsPanel.classList.add('is-hidden');
        moreDetailsPanel.setAttribute('aria-hidden', 'true');
        if (detailsView) {
          detailsView.classList.remove('is-hidden');
          detailsView.classList.add('is-visible');
        }
        this.scrollToColumnTop();
      };

      openTriggers.forEach((btn) => {
        btn.onclick = openMoreDetails;
      });
      closeTriggers.forEach((btn) => {
        btn.onclick = closeMoreDetails;
      });

      // Tab switching
      tabBtns.forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          const tabKey = btn.getAttribute('data-tab');
          tabBtns.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');

          tabPanes.forEach((pane) => {
            if (pane.id === `m-tab-${tabKey}`) {
              pane.classList.add('active');
            } else {
              pane.classList.remove('active');
            }
          });
        };
      });
    }

    scrollToColumnTop() {
      const modalContent = this.container.closest('.m-modal--content') || document.querySelector('.m-modal.m-open-modal .m-modal--content');
      if (modalContent) {
        modalContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }

      const targetEl = this.container.querySelector('.m-luxury-col-info') || this.container.querySelector('.m-luxury-product-section') || this.container;
      if (targetEl) {
        const headerOffset = 90;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    }
  }

  // Initialize sitewide on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    window.LuxuryProduct = new LuxuryProductController(document);
  });

  // Re-init on Shopify Section Load / Design Mode
  document.addEventListener('shopify:section:load', (e) => {
    window.LuxuryProduct = new LuxuryProductController(e.target);
  });

  // Re-init on Quick View loaded custom events
  document.addEventListener('quick-view:loaded', () => {
    const qvContent = document.querySelector('#MainProduct-quick-view__content') || document.querySelector('.m-luxury-quickview-modal-content');
    if (qvContent) {
      new LuxuryProductController(qvContent);
    }
  });

  document.addEventListener('tcustomizer-custom-show-quick-view', () => {
    const qvContent = document.querySelector('#MainProduct-quick-view__content') || document.querySelector('.m-luxury-quickview-modal-content');
    if (qvContent) {
      new LuxuryProductController(qvContent);
    }
  });

  // Expose globally
  window.LuxuryProductController = LuxuryProductController;
})();
