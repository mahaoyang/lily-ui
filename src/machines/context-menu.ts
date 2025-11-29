/**
 * Context Menu State Machine
 *
 * A menu that appears on right-click with various actions.
 * Similar to dropdown menu but triggered by context menu event.
 */

export interface ContextMenuConfig {
  onOpenChange?: (open: boolean) => void;
}

export default function createContextMenu(config: ContextMenuConfig = {}) {
  return {
    // State
    open: false,
    x: 0,
    y: 0,

    // Methods
    handleContextMenu(event: MouseEvent) {
      event.preventDefault();

      this.x = event.clientX;
      this.y = event.clientY;
      this.open = true;

      config.onOpenChange?.(true);

      // Add click listener to close menu when clicking outside
      setTimeout(() => {
        document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
      }, 0);
    },

    handleDocumentClick(event: MouseEvent) {
      // Check if click is outside the menu
      const menu = document.querySelector('[data-context-menu]');
      if (menu && !menu.contains(event.target as Node)) {
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

    // Get position styles for the menu
    getMenuStyles() {
      return {
        position: 'fixed',
        left: `${this.x}px`,
        top: `${this.y}px`,
        zIndex: 50
      };
    },

    // Handle keyboard navigation
    handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    }
  };
}
