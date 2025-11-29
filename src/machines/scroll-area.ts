interface ScrollAreaConfig {
  /** Scrollbar visibility: 'auto' | 'always' | 'scroll' | 'hover' */
  type?: "auto" | "always" | "scroll" | "hover";
  /** Hide delay in ms (only for 'scroll' type) */
  scrollHideDelay?: number;
  /** Which scrollbars to show: 'vertical' | 'horizontal' | 'both' */
  scrollbars?: "vertical" | "horizontal" | "both";
}

export default function createScrollArea(config: ScrollAreaConfig = {}) {
  const {
    type = "hover",
    scrollHideDelay = 600,
    scrollbars = "vertical",
  } = config;

  return {
    type,
    scrollHideDelay,
    scrollbars,

    // Track scrollbar visibility
    verticalVisible: type === "always",
    horizontalVisible: type === "always",

    // Track if scrolling
    isScrolling: false,
    scrollTimeout: null as ReturnType<typeof setTimeout> | null,

    // Track if hovering
    isHovering: false,

    // Track dragging
    isDraggingVertical: false,
    isDraggingHorizontal: false,

    // Scroll position (0-1)
    scrollTopRatio: 0,
    scrollLeftRatio: 0,

    // Thumb size ratio (0-1)
    thumbHeightRatio: 1,
    thumbWidthRatio: 1,

    // Show scrollbar based on type
    get showVertical() {
      if (this.scrollbars === "horizontal") return false;
      if (this.thumbHeightRatio >= 1) return false; // No overflow
      if (this.type === "always") return true;
      if (this.type === "hover") return this.isHovering || this.isDraggingVertical;
      if (this.type === "scroll") return this.isScrolling || this.isDraggingVertical;
      // auto - show when hovering or scrolling
      return this.isHovering || this.isScrolling || this.isDraggingVertical;
    },

    get showHorizontal() {
      if (this.scrollbars === "vertical") return false;
      if (this.thumbWidthRatio >= 1) return false; // No overflow
      if (this.type === "always") return true;
      if (this.type === "hover") return this.isHovering || this.isDraggingHorizontal;
      if (this.type === "scroll") return this.isScrolling || this.isDraggingHorizontal;
      // auto
      return this.isHovering || this.isScrolling || this.isDraggingHorizontal;
    },

    // Update scroll metrics from viewport element
    updateMetrics(el: HTMLElement) {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;

      // Calculate thumb size ratios
      this.thumbHeightRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1;
      this.thumbWidthRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1;

      // Calculate scroll position ratios
      const maxScrollTop = scrollHeight - clientHeight;
      const maxScrollLeft = scrollWidth - clientWidth;

      this.scrollTopRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
      this.scrollLeftRatio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
    },

    // Handle scroll event
    onScroll(el: HTMLElement) {
      this.updateMetrics(el);
      this.isScrolling = true;

      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Set timeout to hide scrollbar
      if (this.type === "scroll" || this.type === "auto") {
        this.scrollTimeout = setTimeout(() => {
          this.isScrolling = false;
        }, this.scrollHideDelay);
      }
    },

    // Mouse enter/leave handlers
    onMouseEnter() {
      this.isHovering = true;
    },

    onMouseLeave() {
      this.isHovering = false;
    },

    // Calculate thumb style for vertical scrollbar
    get verticalThumbStyle() {
      const thumbHeight = Math.max(this.thumbHeightRatio * 100, 10); // Min 10%
      const trackSpace = 100 - thumbHeight;
      const top = this.scrollTopRatio * trackSpace;
      return `height: ${thumbHeight}%; top: ${top}%`;
    },

    // Calculate thumb style for horizontal scrollbar
    get horizontalThumbStyle() {
      const thumbWidth = Math.max(this.thumbWidthRatio * 100, 10); // Min 10%
      const trackSpace = 100 - thumbWidth;
      const left = this.scrollLeftRatio * trackSpace;
      return `width: ${thumbWidth}%; left: ${left}%`;
    },

    // Start dragging vertical thumb
    startDragVertical(event: MouseEvent, trackEl: HTMLElement, viewportEl: HTMLElement) {
      event.preventDefault();
      this.isDraggingVertical = true;

      const startY = event.clientY;
      const startScrollTop = viewportEl.scrollTop;
      const trackHeight = trackEl.clientHeight;
      const maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;

      const onMouseMove = (e: MouseEvent) => {
        const deltaY = e.clientY - startY;
        const scrollDelta = (deltaY / trackHeight) * viewportEl.scrollHeight;
        viewportEl.scrollTop = Math.max(0, Math.min(maxScroll, startScrollTop + scrollDelta));
      };

      const onMouseUp = () => {
        this.isDraggingVertical = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },

    // Start dragging horizontal thumb
    startDragHorizontal(event: MouseEvent, trackEl: HTMLElement, viewportEl: HTMLElement) {
      event.preventDefault();
      this.isDraggingHorizontal = true;

      const startX = event.clientX;
      const startScrollLeft = viewportEl.scrollLeft;
      const trackWidth = trackEl.clientWidth;
      const maxScroll = viewportEl.scrollWidth - viewportEl.clientWidth;

      const onMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const scrollDelta = (deltaX / trackWidth) * viewportEl.scrollWidth;
        viewportEl.scrollLeft = Math.max(0, Math.min(maxScroll, startScrollLeft + scrollDelta));
      };

      const onMouseUp = () => {
        this.isDraggingHorizontal = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },

    // Click on vertical track to jump
    clickVerticalTrack(event: MouseEvent, trackEl: HTMLElement, viewportEl: HTMLElement) {
      const rect = trackEl.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const ratio = clickY / rect.height;
      const maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;
      viewportEl.scrollTop = ratio * maxScroll;
    },

    // Click on horizontal track to jump
    clickHorizontalTrack(event: MouseEvent, trackEl: HTMLElement, viewportEl: HTMLElement) {
      const rect = trackEl.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const ratio = clickX / rect.width;
      const maxScroll = viewportEl.scrollWidth - viewportEl.clientWidth;
      viewportEl.scrollLeft = ratio * maxScroll;
    },

    // Initialize - call after element is mounted
    init(viewportEl: HTMLElement) {
      this.updateMetrics(viewportEl);
    },
  };
}
