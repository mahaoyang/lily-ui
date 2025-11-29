// src/machines/scroll-area.ts
function createScrollArea(config = {}) {
  const {
    type = "hover",
    scrollHideDelay = 600,
    scrollbars = "vertical"
  } = config;
  return {
    type,
    scrollHideDelay,
    scrollbars,
    verticalVisible: type === "always",
    horizontalVisible: type === "always",
    isScrolling: false,
    scrollTimeout: null,
    isHovering: false,
    isDraggingVertical: false,
    isDraggingHorizontal: false,
    scrollTopRatio: 0,
    scrollLeftRatio: 0,
    thumbHeightRatio: 1,
    thumbWidthRatio: 1,
    get showVertical() {
      if (this.scrollbars === "horizontal")
        return false;
      if (this.thumbHeightRatio >= 1)
        return false;
      if (this.type === "always")
        return true;
      if (this.type === "hover")
        return this.isHovering || this.isDraggingVertical;
      if (this.type === "scroll")
        return this.isScrolling || this.isDraggingVertical;
      return this.isHovering || this.isScrolling || this.isDraggingVertical;
    },
    get showHorizontal() {
      if (this.scrollbars === "vertical")
        return false;
      if (this.thumbWidthRatio >= 1)
        return false;
      if (this.type === "always")
        return true;
      if (this.type === "hover")
        return this.isHovering || this.isDraggingHorizontal;
      if (this.type === "scroll")
        return this.isScrolling || this.isDraggingHorizontal;
      return this.isHovering || this.isScrolling || this.isDraggingHorizontal;
    },
    updateMetrics(el) {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;
      this.thumbHeightRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1;
      this.thumbWidthRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1;
      const maxScrollTop = scrollHeight - clientHeight;
      const maxScrollLeft = scrollWidth - clientWidth;
      this.scrollTopRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
      this.scrollLeftRatio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
    },
    onScroll(el) {
      this.updateMetrics(el);
      this.isScrolling = true;
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      if (this.type === "scroll" || this.type === "auto") {
        this.scrollTimeout = setTimeout(() => {
          this.isScrolling = false;
        }, this.scrollHideDelay);
      }
    },
    onMouseEnter() {
      this.isHovering = true;
    },
    onMouseLeave() {
      this.isHovering = false;
    },
    get verticalThumbStyle() {
      const thumbHeight = Math.max(this.thumbHeightRatio * 100, 10);
      const trackSpace = 100 - thumbHeight;
      const top = this.scrollTopRatio * trackSpace;
      return `height: ${thumbHeight}%; top: ${top}%`;
    },
    get horizontalThumbStyle() {
      const thumbWidth = Math.max(this.thumbWidthRatio * 100, 10);
      const trackSpace = 100 - thumbWidth;
      const left = this.scrollLeftRatio * trackSpace;
      return `width: ${thumbWidth}%; left: ${left}%`;
    },
    startDragVertical(event, trackEl, viewportEl) {
      event.preventDefault();
      this.isDraggingVertical = true;
      const startY = event.clientY;
      const startScrollTop = viewportEl.scrollTop;
      const trackHeight = trackEl.clientHeight;
      const maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;
      const onMouseMove = (e) => {
        const deltaY = e.clientY - startY;
        const scrollDelta = deltaY / trackHeight * viewportEl.scrollHeight;
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
    startDragHorizontal(event, trackEl, viewportEl) {
      event.preventDefault();
      this.isDraggingHorizontal = true;
      const startX = event.clientX;
      const startScrollLeft = viewportEl.scrollLeft;
      const trackWidth = trackEl.clientWidth;
      const maxScroll = viewportEl.scrollWidth - viewportEl.clientWidth;
      const onMouseMove = (e) => {
        const deltaX = e.clientX - startX;
        const scrollDelta = deltaX / trackWidth * viewportEl.scrollWidth;
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
    clickVerticalTrack(event, trackEl, viewportEl) {
      const rect = trackEl.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const ratio = clickY / rect.height;
      const maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;
      viewportEl.scrollTop = ratio * maxScroll;
    },
    clickHorizontalTrack(event, trackEl, viewportEl) {
      const rect = trackEl.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const ratio = clickX / rect.width;
      const maxScroll = viewportEl.scrollWidth - viewportEl.clientWidth;
      viewportEl.scrollLeft = ratio * maxScroll;
    },
    init(viewportEl) {
      this.updateMetrics(viewportEl);
    }
  };
}
export {
  createScrollArea as default
};
