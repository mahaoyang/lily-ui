// src/machines/popover.ts
function createPopover(options = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    size = "2",
    onOpenChange
  } = options;
  return {
    open: defaultOpen,
    size,
    show() {
      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
      }
    },
    hide() {
      if (this.open) {
        this.open = false;
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
    triggerProps() {
      return {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": this.open,
        "@click": "toggle()"
      };
    },
    contentProps() {
      return {
        role: "dialog",
        tabindex: "-1",
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined,
        "@click.outside": closeOnOutsideClick ? "hide()" : undefined
      };
    },
    closeProps() {
      return {
        type: "button",
        "aria-label": "Close popover",
        "@click": "hide()"
      };
    }
  };
}
export {
  createPopover
};
