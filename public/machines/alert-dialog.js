// src/machines/alert-dialog.ts
function createAlertDialog(options = {}) {
  const {
    defaultOpen = false,
    closeOnEscape = false,
    size = "3",
    align = "center",
    onConfirm,
    onCancel,
    onOpenChange
  } = options;
  return {
    open: defaultOpen,
    loading: false,
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
      if (this.open && !this.loading) {
        this.open = false;
        this.loading = false;
        this.unlockBodyScroll();
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
      document.body.style.overflow = "hidden";
    },
    unlockBodyScroll() {
      document.body.style.overflow = "";
    },
    overlayProps() {
      return {
        role: "alertdialog",
        "aria-modal": "true",
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined
      };
    },
    contentProps() {
      return {
        role: "document",
        tabindex: "-1"
      };
    },
    confirmProps() {
      return {
        type: "button",
        ":disabled": "loading"
      };
    },
    cancelProps() {
      return {
        type: "button",
        ":disabled": "loading"
      };
    }
  };
}
export {
  createAlertDialog
};
