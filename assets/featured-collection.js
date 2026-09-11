if (!customElements.get("m-featured-collection")) {
  class MFeaturedCollection extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.selectors = {
        loadMoreBtn: "[data-load-more]",
        loadMoreBtnWrapper: ".m-featured-collection__button",
        productsContainer: "[data-products-container]",
        products: [".m-product-card"],
        soldNumber: ["[data-sold-number]"],
        availableNumber: ["[data-available-number]"],
        countDown: "[data-flashsale-countdown]",
        slideControls: ".m-slider-controls",
        slideContainer: ".m-mixed-layout__wrapper",
        scrollbar: "[data-scrollbar]",
        scrollbarTrack: "[data-scrollbar-track]",
        scrollbarThumb: "[data-scrollbar-thumb]",
      };
      this.domNodes = queryDomNodes(this.selectors, this);

      this.buttonType = this.dataset.buttonType;
      this.infiniteLoad = this.dataset.infiniteLoad;
      this.enableSlider = this.dataset.enableSlider === "true";
      this.showPagination = this.dataset.showPagination === "true";
      this.showNavigation = this.dataset.showNavigation === "true";
      this.enableFlashsale = this.dataset.enableFlashsale === "true";
      this.enableCountdown = this.dataset.enableCountdown === "true";
      this.id = this.dataset.id;
      this.items = this.dataset.items;
      this.itemsMobile = parseFloat(this.dataset.itemsMobile) || 1.5;
      this.itemGap = parseInt(this.dataset.itemGap) || 30;
      this.itemGapMobile = parseInt(this.dataset.itemGapMobile) || 16;
      this.showScrollbar = this.dataset.showScrollbar === "true";
      this.mobileDisableSlider = this.dataset.mobileDisableSlider === "true";

      this.initByScreenSize();
      this.initScrollbarEvents();

      document.addEventListener("matchMobile", () => {
        this.initByScreenSize();
      });
      document.addEventListener("unmatchMobile", () => {
        this.initByScreenSize();
      });

      if (this.enableFlashsale) this.initFlashSale();

      this.canLoad = true;
      this.currentPage = 1;
      this.spinner = spinner();

      if (!this.enableSlider && this.buttonType === "load" && this.infiniteLoad === "true") {
        this.initInfiniteLoad();
      }
      if (!this.enableSlider && this.buttonType === "load") {
        this.initLoadMore();
      }
      if (
        MinimogTheme.config.mqlMobile &&
        this.mobileDisableSlider &&
        this.buttonType === "load" &&
        this.infiniteLoad === "true"
      ) {
        this.initInfiniteLoad();
      }
      if (MinimogTheme.config.mqlMobile && this.mobileDisableSlider && this.buttonType === "load") {
        this.initLoadMore();
      }

      document.addEventListener("matchMobile", () => {
        if (MinimogTheme.config.mqlMobile && this.mobileDisableSlider && this.buttonType === "load") {
          this.initLoadMore();
        }
        if (
          MinimogTheme.config.mqlMobile &&
          this.mobileDisableSlider &&
          this.buttonType === "load" &&
          this.infiniteLoad === "true"
        ) {
          this.initInfiniteLoad();
        }
      });
    }

    initByScreenSize() {
      const { slideContainer, slideControls } = queryDomNodes(this.selectors, this);

      if (!this.enableSlider) {
        if (this.showScrollbar) {
          this.initScrollbarForCssScroll();
        }
        return;
      }

      if (MinimogTheme.config.mqlMobile && this.mobileDisableSlider) {
        slideControls && slideControls.classList.add("m:hidden");
        slideContainer && slideContainer.classList.remove("swiper-container");
        if (this.swiper) {
          this.swiper.destroy(false, true);
          this.swiper = null;
          this.slider = null;
        }
        if (this.showScrollbar) {
          this.initScrollbarForCssScroll();
        }
      } else {
        slideControls && slideControls.classList.remove("m:hidden");
        this.initSlider();
      }
    }

    initSlider() {
      const { slideContainer } = queryDomNodes(this.selectors, this);
      if (!slideContainer) return;

      const controlsContainer = this.querySelector(".m-slider-controls");
      const prevButton = controlsContainer && controlsContainer.querySelector(".m-slider-controls__button-prev");
      const nextButton = controlsContainer && controlsContainer.querySelector(".m-slider-controls__button-next");
      const slideWrapper = slideContainer.querySelector(".swiper-wrapper") || slideContainer.querySelector(".m-mixed-layout__inner");
      if (!slideWrapper) return;
      const slideItemsLength = slideWrapper.childElementCount;

      slideContainer.classList.add("swiper-container");
      slideWrapper.classList.add("swiper-wrapper");

      const itemsMobile = this.itemsMobile || 1.5;
      const itemsDesktop = parseInt(this.items) || 4;
      const gapMobile = this.itemGapMobile !== undefined ? this.itemGapMobile : 16;
      const gapDesktop = this.itemGap !== undefined ? this.itemGap : 30;

      if (this.swiper) {
        this.swiper.destroy(false, true);
        this.swiper = null;
        this.slider = null;
      }

      this.slider = new MinimogLibs.Swiper(slideContainer, {
        slidesPerView: itemsMobile,
        spaceBetween: gapMobile,
        grabCursor: true,
        simulateTouch: true,
        allowTouchMove: true,
        touchRatio: 1,
        resistance: true,
        resistanceRatio: 0.85,
        preventClicks: true,
        preventClicksPropagation: true,
        loop: false,
        showPagination: this.showPagination,
        showNavigation: this.showNavigation,
        pagination: this.showPagination
          ? {
              el: this.querySelector(".swiper-pagination"),
              clickable: true,
            }
          : false,
        breakpoints: {
          0: {
            slidesPerView: itemsMobile,
            spaceBetween: gapMobile,
          },
          640: {
            slidesPerView: Math.min(Math.max(itemsMobile, 2), itemsDesktop),
            spaceBetween: gapMobile,
          },
          768: {
            slidesPerView: itemsDesktop >= 3 ? 3 : itemsDesktop,
            spaceBetween: gapDesktop,
          },
          1024: {
            slidesPerView: itemsDesktop >= 4 ? 4 : itemsDesktop,
            spaceBetween: gapDesktop,
          },
          1280: {
            slidesPerView: itemsDesktop,
            spaceBetween: gapDesktop,
          },
        },
        threshold: 2,
        on: {
          init: (swiper) => {
            this.updateScrollbar(swiper);
            setTimeout(() => {
              // Calculate controls position
              const firstItem = this.querySelector(".m-image") || this.querySelector(".m-placeholder-svg");
              if (firstItem && controlsContainer) {
                const itemHeight = firstItem.clientHeight;
                controlsContainer.style.setProperty("--offset-top", parseInt(itemHeight) / 2 + "px");

                prevButton && prevButton.classList.remove("m:hidden");
                nextButton && nextButton.classList.remove("m:hidden");
              }
              this.updateScrollbar(swiper);
            }, 200);
          },
          slideChange: (swiper) => {
            this.updateScrollbar(swiper);
          },
          setTranslate: (swiper) => {
            this.updateScrollbar(swiper);
          },
          resize: (swiper) => {
            this.updateScrollbar(swiper);
          },
          breakpoint: (swiper, breakpointParams) => {
            if (controlsContainer) {
              const { slidesPerView } = breakpointParams;
              if (slideItemsLength > slidesPerView) {
                controlsContainer.classList.remove("m:hidden");
                swiper.allowTouchMove = true;
              } else {
                controlsContainer.classList.add("m:hidden");
                swiper.allowTouchMove = false;
              }
            }
            this.updateScrollbar(swiper);
          },
        },
      });

      if (this.slider && this.showNavigation) {
        prevButton && prevButton.addEventListener("click", () => this.slider.slidePrev());
        nextButton && nextButton.addEventListener("click", () => this.slider.slideNext());
      }

      this.swiper = slideContainer && slideContainer.swiper;
      this.updateScrollbar(this.swiper);
    }

    initScrollbarEvents() {
      if (!this.showScrollbar) return;
      const { scrollbar, scrollbarTrack, scrollbarThumb } = queryDomNodes(this.selectors, this);
      if (!scrollbarTrack || !scrollbarThumb) return;

      let isDragging = false;
      let startX = 0;
      let initialProgress = 0;

      const onDragStart = (e) => {
        isDragging = true;
        startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        initialProgress = this.currentProgress || 0;
        document.body.style.userSelect = "none";
        scrollbarThumb.classList.add("is-dragging");

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
        document.addEventListener("touchmove", onDragMove, { passive: false });
        document.addEventListener("touchend", onDragEnd);
      };

      const onDragMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const currentX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const trackRect = scrollbarTrack.getBoundingClientRect();
        if (trackRect.width <= 0) return;

        const deltaX = currentX - startX;
        const progressDelta = deltaX / trackRect.width;
        const newProgress = Math.max(0, Math.min(1, initialProgress + progressDelta));

        if (this.swiper) {
          if (typeof this.swiper.setProgress === "function") {
            this.swiper.setProgress(newProgress);
          }
        } else {
          const scrollContainer = this.querySelector(".m-mixed-layout--mobile-scroll");
          if (scrollContainer) {
            const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            scrollContainer.scrollLeft = newProgress * maxScroll;
          }
        }
      };

      const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = "";
        scrollbarThumb.classList.remove("is-dragging");

        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
        document.removeEventListener("touchmove", onDragMove);
        document.removeEventListener("touchend", onDragEnd);

        if (this.swiper && typeof this.swiper.slideReset === "function") {
          this.swiper.slideReset();
        }
      };

      scrollbarThumb.addEventListener("mousedown", onDragStart);
      scrollbarThumb.addEventListener("touchstart", onDragStart, { passive: true });

      scrollbarTrack.addEventListener("click", (e) => {
        if (e.target === scrollbarThumb) return;
        const trackRect = scrollbarTrack.getBoundingClientRect();
        if (trackRect.width <= 0) return;
        const clickX = e.clientX - trackRect.left;
        const progress = Math.max(0, Math.min(1, clickX / trackRect.width));

        if (this.swiper) {
          if (typeof this.swiper.setProgress === "function") {
            this.swiper.setProgress(progress, 300);
          }
        } else {
          const scrollContainer = this.querySelector(".m-mixed-layout--mobile-scroll");
          if (scrollContainer) {
            const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            scrollContainer.scrollTo({
              left: progress * maxScroll,
              behavior: "smooth",
            });
          }
        }
      });
    }

    updateScrollbar(swiper) {
      if (!this.showScrollbar) return;
      const { scrollbar, scrollbarTrack, scrollbarThumb } = queryDomNodes(this.selectors, this);
      if (!scrollbar || !scrollbarTrack || !scrollbarThumb) return;

      const s = swiper || this.swiper || this.slider;
      if (!s) return;

      const totalSlides = s.slides ? s.slides.length : this.querySelectorAll(".swiper-slide").length;
      let currentSlidesPerView = s.params ? s.params.slidesPerView : this.itemsMobile;
      if (typeof currentSlidesPerView !== "number") {
        currentSlidesPerView = parseFloat(currentSlidesPerView) || 1.5;
      }

      if (totalSlides <= currentSlidesPerView) {
        scrollbar.classList.add("m:hidden");
        return;
      } else {
        scrollbar.classList.remove("m:hidden");
      }

      const trackWidth = scrollbarTrack.clientWidth;
      if (trackWidth <= 0) return;

      const thumbRatio = Math.min(1, currentSlidesPerView / totalSlides);
      const thumbWidth = Math.max(28, trackWidth * thumbRatio);
      const maxTranslate = trackWidth - thumbWidth;

      let progress = typeof s.progress === "number" ? s.progress : 0;
      progress = Math.max(0, Math.min(1, progress));
      this.currentProgress = progress;

      const thumbTranslate = progress * maxTranslate;

      scrollbarThumb.style.width = `${thumbWidth}px`;
      scrollbarThumb.style.transform = `translateX(${thumbTranslate}px)`;
    }

    initScrollbarForCssScroll() {
      const { scrollbar, scrollbarTrack, scrollbarThumb } = queryDomNodes(this.selectors, this);
      if (!scrollbar || !scrollbarTrack || !scrollbarThumb) return;

      const scrollContainer = this.querySelector(".m-mixed-layout--mobile-scroll");
      if (!scrollContainer) return;

      const updateCssScrollbar = () => {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        if (maxScroll <= 0) {
          scrollbar.classList.add("m:hidden");
          return;
        }
        scrollbar.classList.remove("m:hidden");

        const progress = Math.max(0, Math.min(1, scrollContainer.scrollLeft / maxScroll));
        this.currentProgress = progress;

        const trackWidth = scrollbarTrack.clientWidth;
        if (trackWidth <= 0) return;

        const thumbRatio = Math.min(1, scrollContainer.clientWidth / scrollContainer.scrollWidth);
        const thumbWidth = Math.max(28, trackWidth * thumbRatio);
        const maxTranslate = trackWidth - thumbWidth;
        const thumbTranslate = progress * maxTranslate;

        scrollbarThumb.style.width = `${thumbWidth}px`;
        scrollbarThumb.style.transform = `translateX(${thumbTranslate}px)`;
      };

      scrollContainer.removeEventListener("scroll", this._onCssScrollHandler);
      this._onCssScrollHandler = () => updateCssScrollbar();
      scrollContainer.addEventListener("scroll", this._onCssScrollHandler, { passive: true });

      // Init drag to scroll for mouse users on CSS scroll container
      let isMouseDown = false;
      let startX, scrollLeft;

      scrollContainer.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        scrollContainer.style.cursor = "grabbing";
        startX = e.pageX - scrollContainer.offsetLeft;
        scrollLeft = scrollContainer.scrollLeft;
      });

      scrollContainer.addEventListener("mouseleave", () => {
        isMouseDown = false;
        scrollContainer.style.cursor = "grab";
      });

      scrollContainer.addEventListener("mouseup", () => {
        isMouseDown = false;
        scrollContainer.style.cursor = "grab";
      });

      scrollContainer.addEventListener("mousemove", (e) => {
        if (!isMouseDown) return;
        e.preventDefault();
        const x = e.pageX - scrollContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollContainer.scrollLeft = scrollLeft - walk;
      });

      setTimeout(updateCssScrollbar, 100);
    }

    initLoadMore() {
      this.triggerLoad = false;
      this.totalPages = parseInt(this.dataset.totalPages);

      addEventDelegate({
        context: this.container,
        selector: this.selectors.loadMoreBtn,
        handler: (e) => {
          e.preventDefault();
          this.handleLoadMore();
        },
      });
    }

    initInfiniteLoad() {
      const maxPages = this.dataset.maxPages;

      window.addEventListener("scroll", (e) => {
        this.canLoad = this.currentPage < parseInt(maxPages);

        if (!this.canLoad) return;
        if (this.offsetTop + this.clientHeight - window.innerHeight < window.scrollY && !this.triggerLoad) {
          this.triggerLoad = true;
          this.handleLoadMore();
        }
      });
    }

    async handleLoadMore() {
      this.currentPage++;
      this.canLoad = this.currentPage < this.totalPages;
      this.toggleLoading(true);
      const collectionID = this.dataset.collectionId;
      const res = await fetchCountDown(collectionID);

      const url = this.dataset.url;
      const dataUrl = `${url}?page=${this.currentPage}&section_id=${this.id}`;
      fetchCache(dataUrl).then((html) => {
        this.toggleLoading(false);
        const dom = generateDomFromString(html);
        const products = dom.querySelector(this.selectors.productsContainer);
        const oldCards = this.domNodes.productsContainer.childElementCount;
        let isAppended = false;

        if (products) {
          Array.from(products.childNodes).forEach((product) => {
            this.domNodes.productsContainer.appendChild(product);
            const check = setInterval(() => {
              if (this.domNodes.productsContainer.childElementCount > oldCards) {
                clearInterval(check);
                isAppended = true;
              }
            }, 50);
          });
        }

        if (this.enableFlashsale && res.ok && res.payload && res.payload.length) {
          const { expires_date, cdt_type, duration } = res.payload[0];
          Object.assign(this, { expires_date, cdt_type, duration });
          const check = setInterval(() => {
            if (isAppended) {
              clearInterval(check);
              const cards = this.domNodes.productsContainer.querySelectorAll(".m-product-card");
              cards.forEach((card) => {
                const content = card.querySelector(".m-product-card__content");
                const progress = card.querySelector(".m-product-sale-progress");
                if (!progress) {
                  let soldNumber;
                  if (card.dataset.soldNumber) {
                    soldNumber = card.dataset.soldNumber;
                  }
                  const component = saleProgress(res.payload[0], card.dataset.productId, soldNumber);
                  const newComponent = generateDomFromString(component);
                  content.appendChild(newComponent);
                }
              });
            }
          }, 50);
        }

        this.triggerLoad = false;

        if (this.swiper && typeof this.swiper.update === "function") {
          this.swiper.update();
          this.updateScrollbar(this.swiper);
        }

        if (!this.canLoad) {
          this.domNodes.loadMoreBtn && this.domNodes.loadMoreBtn.classList.add("m:hidden");
        }
      });
    }

    toggleLoading(status) {
      if (!this.domNodes.loadMoreBtn) return;
      if (status) {
        this.domNodes.loadMoreBtn.classList.add("m-spinner-loading");
      } else {
        this.domNodes.loadMoreBtn.classList.remove("m-spinner-loading");
      }
    }

    async initFlashSale() {
      const collectionID = this.dataset.collectionId;
      const res = await fetchCountDown(collectionID);
      if (res.ok && res.payload && res.payload.length) {
        const { expires_date, cdt_type, duration } = res.payload[0];
        Object.assign(this, { expires_date, cdt_type, duration });
        this.domNodes.products.forEach((card) => {
          const content = card.querySelector(".m-product-card__content");
          const pcardSale = card.querySelector(".m-product-sale-progress");
          let soldNumber;
          if (card.dataset.soldNumber) {
            soldNumber = card.dataset.soldNumber;
          }
          const component = saleProgress(res.payload[0], card.dataset.productId, soldNumber);
          const newComponent = generateDomFromString(component);
          if (!pcardSale) {
            content.appendChild(newComponent);
          }
        });
        this.initCountDown();
      }
    }

    initCountDown() {
      const endTime = new Date(this.expires_date).getTime();
      this.countDownTimer = new CountdownTimer(this.domNodes.countDown, Date.now(), endTime, {
        type: this.cdt_type,
        duration: this.duration,
      });
    }
  }

  customElements.define("m-featured-collection", MFeaturedCollection);
}
