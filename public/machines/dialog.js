// src/machines/dialog.ts
var bodyLockCount = 0;
var previousBodyOverflow = null;
var dialogIdCounter = 0;
function createDialog(options = {}) {
  const {
    defaultOpen = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = "3",
    align = "center",
    labelId,
    descriptionId,
    id,
    onOpenChange
  } = options;
  const contentId = id ?? `dialog-${++dialogIdCounter}`;
  return {
    open: defaultOpen,
    lastActiveElement: null,
    size,
    align,
    init() {
      if (this.open) {
        this.lockBodyScroll();
      }
    },
    show() {
      if (!this.open) {
        this.open = true;
        this.lastActiveElement = document.activeElement;
        this.lockBodyScroll();
        this.$nextTick?.(() => {
          const content = this?.$refs?.content;
          content?.focus();
        });
        onOpenChange?.(true);
      }
    },
    hide() {
      if (this.open) {
        this.open = false;
        this.unlockBodyScroll();
        this.lastActiveElement?.focus?.({ preventScroll: true });
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
      if (bodyLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      bodyLockCount += 1;
    },
    unlockBodyScroll() {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow ?? "";
        previousBodyOverflow = null;
      }
    },
    overlayProps() {
      return {
        "@click.self": closeOnOverlayClick ? "hide()" : undefined,
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined,
        "data-state": this.open ? "open" : "closed"
      };
    },
    contentProps() {
      return {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": labelId,
        "aria-describedby": descriptionId,
        tabindex: "-1",
        "data-state": this.open ? "open" : "closed",
        "x-ref": "content",
        id: contentId
      };
    },
    closeProps() {
      return {
        type: "button",
        "aria-label": "Close dialog"
      };
    },
    triggerProps() {
      return {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": this.open,
        "aria-controls": contentId,
        "@click": "toggle()"
      };
    }
  };
}
export {
  createDialog
};
