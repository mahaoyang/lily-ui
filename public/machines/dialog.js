// src/machines/dialog.ts
function createDialog(initialOpen = false) {
  return {
    open: initialOpen,
    triggerElement: null,
    open() {
      this.open = true;
      this.triggerElement = document.activeElement;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.open = false;
      document.body.style.overflow = "";
      if (this.triggerElement) {
        this.triggerElement.focus();
        this.triggerElement = null;
      }
    },
    toggle() {
      if (this.open) {
        this.close();
      } else {
        this.open();
      }
    }
  };
}
function dialog(initialOpen = false) {
  return createDialog(initialOpen);
}
if (typeof window !== "undefined") {
  window.dialog = dialog;
}
var dialog_default = dialog;
export {
  dialog,
  dialog_default as default,
  createDialog
};
