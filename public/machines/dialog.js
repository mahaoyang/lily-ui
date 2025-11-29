// src/machines/dialog.ts
function createDialog(options = {}) {
  const {
    defaultOpen = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = "3",
    align = "center",
    onOpenChange
  } = options;
  return {
    open: defaultOpen,
    size,
    align,
    show() {
      if (!this.open) {
        this.open = true;
        this.lockBodyScroll();
        onOpenChange?.(true);
      }
    },
    hide() {
      if (this.open) {
        this.open = false;
        this.unlockBodyScroll();
        onOpenChange?.(false);
      }
    },
    toggle() {
      if (this.open) {
        this.hide();
      } else {
        this.show();
      }
    },
    lockBodyScroll() {
      document.body.style.overflow = "hidden";
    },
    unlockBodyScroll() {
      document.body.style.overflow = "";
    },
    overlayProps() {
      return {
        role: "dialog",
        "aria-modal": "true",
        "@click.self": closeOnOverlayClick ? "hide()" : undefined,
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined
      };
    },
    contentProps() {
      return {
        role: "document",
        tabindex: "-1"
      };
    },
    closeProps() {
      return {
        type: "button",
        "aria-label": "Close dialog"
      };
    }
  };
}
export {
  createDialog
};
