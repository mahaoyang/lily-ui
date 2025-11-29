// src/machines/dialog.ts
function createDialog(config = {}) {
  const { defaultOpen = false } = config;
  let lastFocused = null;
  return {
    open: defaultOpen,
    openDialog() {
      if (this.open)
        return;
      lastFocused = document.activeElement;
      this.open = true;
      config.onOpenChange?.(true);
    },
    closeDialog() {
      if (!this.open)
        return;
      this.open = false;
      config.onOpenChange?.(false);
      if (lastFocused)
        lastFocused.focus({ preventScroll: true });
    },
    toggleDialog() {
      this.open ? this.closeDialog() : this.openDialog();
    },
    overlayProps() {
      return {
        "x-show": this.open,
        class: "fixed inset-0 bg-black/50",
        "@click": () => this.closeDialog()
      };
    },
    contentProps() {
      return {
        role: "dialog",
        "aria-modal": "true",
        "x-show": this.open,
        "@keydown.escape.window": () => this.closeDialog(),
        class: "fixed inset-0 flex items-center justify-center",
        "@click.outside": () => this.closeDialog()
      };
    },
    triggerProps() {
      return {
        "@click": () => this.openDialog()
      };
    }
  };
}
export {
  createDialog as default
};
