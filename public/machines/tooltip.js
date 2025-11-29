// src/machines/tooltip.ts
function createTooltip(config = {}) {
  const { openDelay = 80, closeDelay = 80 } = config;
  let openTimer = null;
  let closeTimer = null;
  return {
    open: false,
    show() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (openTimer)
        clearTimeout(openTimer);
      openTimer = window.setTimeout(() => {
        this.open = true;
      }, openDelay);
    },
    hide() {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (closeTimer)
        clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        this.open = false;
      }, closeDelay);
    },
    triggerProps() {
      return {
        "@mouseenter": () => this.show(),
        "@mouseleave": () => this.hide(),
        "@focus": () => this.show(),
        "@blur": () => this.hide(),
        "@keydown.escape.window": () => this.hide(),
        "aria-describedby": "tooltip-content"
      };
    },
    contentProps() {
      return {
        id: "tooltip-content",
        role: "tooltip",
        "x-show": this.open
      };
    }
  };
}
export {
  createTooltip as default
};
