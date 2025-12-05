/**
 * Dialog State Machine
 *
 * A state machine for managing dialog/modal state with proper
 * accessibility support and animations.
 */

export interface DialogState {
  open: boolean;
  triggerElement: HTMLElement | null;
}

export interface DialogActions {
  open(): void;
  close(): void;
  toggle(): void;
}

export function createDialog(initialOpen = false): DialogState & DialogActions {
  return {
    open: initialOpen,
    triggerElement: null,

    open() {
      this.open = true;
      // Store the trigger element for focus restoration
      this.triggerElement = document.activeElement as HTMLElement;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    },

    close() {
      this.open = false;
      // Restore body scroll
      document.body.style.overflow = '';
      // Restore focus to trigger element
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

// Export for Alpine.js data registration
export function dialog(initialOpen = false) {
  return createDialog(initialOpen);
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
  (window as any).dialog = dialog;
}

export default dialog;
