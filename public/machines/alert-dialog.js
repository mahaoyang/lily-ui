// src/machines/alert-dialog.ts
var alertDialogIdCounter = 0;
var bodyLockCount = 0;
var previousBodyOverflow = null;
function createAlertDialog(options = {}) {
  const {
    defaultOpen = false,
    closeOnEscape = false,
    size = "3",
    align = "center",
    onConfirm,
    onCancel,
    onOpenChange,
    labelId,
    descriptionId,
    id
  } = options;
  const contentId = id ?? `alert-dialog-${++alertDialogIdCounter}`;
  return {
    open: defaultOpen,
    loading: false,
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
      if (this.open && !this.loading) {
        this.open = false;
        this.loading = false;
        this.unlockBodyScroll();
        this.lastActiveElement?.focus?.({ preventScroll: true });
        onOpenChange?.(false);
      }
    },
    async confirm() {
      if (this.loading)
        return;
      try {
        if (onConfirm) {
          this.loading = true;
          await onConfirm();
        }
        this.loading = false;
        this.hide();
      } catch (error) {
        console.error("Alert dialog confirm error:", error);
        this.loading = false;
      }
    },
    async cancel() {
      if (this.loading)
        return;
      try {
        if (onCancel) {
          this.loading = true;
          await onCancel();
        }
        this.loading = false;
        this.hide();
      } catch (error) {
        console.error("Alert dialog cancel error:", error);
        this.loading = false;
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
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined,
        "data-state": this.open ? "open" : "closed"
      };
    },
    contentProps() {
      return {
        role: "alertdialog",
        "aria-modal": "true",
        "aria-labelledby": labelId,
        "aria-describedby": descriptionId,
        tabindex: "-1",
        "data-state": this.open ? "open" : "closed",
        "x-ref": "content",
        id: contentId
      };
    },
    confirmProps() {
      return {
        type: "button",
        ":disabled": "loading",
        "@click": "confirm()"
      };
    },
    cancelProps() {
      return {
        type: "button",
        ":disabled": "loading",
        "@click": "cancel()"
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
  createAlertDialog
};
