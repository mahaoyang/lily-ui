// src/machines/context-menu.ts
function createContextMenu(config = {}) {
  return {
    open: false,
    x: 0,
    y: 0,
    handleContextMenu(event) {
      event.preventDefault();
      this.x = event.clientX;
      this.y = event.clientY;
      this.open = true;
      config.onOpenChange?.(true);
      setTimeout(() => {
        document.addEventListener("click", this.handleDocumentClick.bind(this), { once: true });
      }, 0);
    },
    handleDocumentClick(event) {
      const menu = document.querySelector("[data-context-menu]");
      if (menu && !menu.contains(event.target)) {
        this.close();
      }
    },
    close() {
      this.open = false;
      config.onOpenChange?.(false);
    },
    toggle() {
      if (this.open) {
        this.close();
      }
    },
    getMenuStyles() {
      return {
        position: "fixed",
        left: `${this.x}px`,
        top: `${this.y}px`,
        zIndex: 50
      };
    },
    handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    }
  };
}
export {
  createContextMenu as default
};
