/** Visibility only; focus restoration and scroll locking belong to the theme. */
export function createDialog(initialOpen = false) {
  return {
    isOpen: Boolean(initialOpen),
    open() { this.isOpen = true; },
    close() { this.isOpen = false; },
    toggle() { this.isOpen = !this.isOpen; },
  };
}
