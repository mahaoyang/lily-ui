// src/machines/popover.ts
function createPopover(config = {}) {
  const { defaultOpen = false } = config;
  return {
    open: defaultOpen,
    toggle() {
      this.open = !this.open;
      config.onOpenChange?.(this.open);
    },
    openPopover() {
      if (!this.open) {
        this.open = true;
        config.onOpenChange?.(true);
      }
    },
    closePopover() {
      if (this.open) {
        this.open = false;
        config.onOpenChange?.(false);
      }
    },
    triggerProps() {
      return {
        "aria-haspopup": "dialog",
        "aria-expanded": this.open.toString(),
        "@click": () => this.toggle()
      };
    },
    panelProps() {
      return {
        "x-show": this.open,
        "@click.outside": () => this.closePopover(),
        "@keydown.escape.window": () => this.closePopover()
      };
    }
  };
}
export {
  createPopover as default
};
