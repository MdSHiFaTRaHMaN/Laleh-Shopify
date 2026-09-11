if (!customElements.get("m-announcement-bar")) {
  class MAnnouncementBar extends HTMLElement {
    constructor() {
      super();
      this.closeBtn = null;
      this.sliderTimer = null;
      this.handleResize = this.updateHeight.bind(this);
    }

    connectedCallback() {
      this.init();
      this.initSlider();
      this.updateHeight();
      window.addEventListener("resize", this.handleResize, { passive: true });
    }

    disconnectedCallback() {
      window.removeEventListener("resize", this.handleResize);
      if (this.sliderTimer) clearInterval(this.sliderTimer);
    }

    init() {
      this.closeBtn = this.querySelector(".m-announcement-bar__close-btn");
      if (this.closeBtn) {
        this.closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const parentSection = this.closest(".m-announcement-bar");
          if (parentSection) {
            parentSection.style.display = "none";
          } else {
            this.style.display = "none";
          }
          document.documentElement.style.setProperty("--m-announcement-height", "0px");
          if (window.MinimogSettings) {
            window.MinimogSettings.topbarHeight = 0;
          }
          if (this.sliderTimer) clearInterval(this.sliderTimer);
        });
      }
    }

    initSlider() {
      const slider = this.querySelector(".m-announcement-bar__slider");
      if (!slider) return;

      const slides = slider.querySelectorAll(".m-announcement-bar__slide");
      if (slides.length <= 1) return;

      let current = 0;
      const intervalTime = parseInt(this.dataset.slideInterval, 10) || 5000;
      const pauseOnHover = this.dataset.pauseHover === "true";

      const goToNext = () => {
        slides[current].classList.remove("is-active");
        current = (current + 1) % slides.length;
        slides[current].classList.add("is-active");
      };

      const start = () => {
        this.sliderTimer = setInterval(goToNext, intervalTime);
      };
      const stop = () => {
        if (this.sliderTimer) clearInterval(this.sliderTimer);
      };

      start();

      if (pauseOnHover) {
        this.addEventListener("mouseenter", stop);
        this.addEventListener("mouseleave", start);
        this.addEventListener("touchstart", stop, { passive: true });
        this.addEventListener("touchend", start, { passive: true });
      }
    }

    updateHeight() {
      const height = this.offsetHeight || 0;
      document.documentElement.style.setProperty("--m-announcement-height", `${height}px`);
      if (window.MinimogSettings) {
        window.MinimogSettings.topbarHeight = height;
      }
    }
  }

  customElements.define("m-announcement-bar", MAnnouncementBar);
}

// Global hook for Shopify theme editor events
document.addEventListener("shopify:section:load", (e) => {
  const bar = e.target.querySelector("m-announcement-bar");
  if (bar && typeof bar.updateHeight === "function") {
    bar.updateHeight();
  }
});