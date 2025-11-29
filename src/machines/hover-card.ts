/**
 * Hover Card State Machine
 *
 * A card that appears on hover with rich content.
 * Similar to tooltip but with more content and longer delays.
 */

export interface HoverCardConfig {
  openDelay?: number;
  closeDelay?: number;
  onOpenChange?: (open: boolean) => void;
}

export default function createHoverCard(config: HoverCardConfig = {}) {
  return {
    // State
    open: false,
    openDelay: config.openDelay ?? 700,
    closeDelay: config.closeDelay ?? 300,
    openTimeout: null as number | null,
    closeTimeout: null as number | null,

    // Methods
    scheduleOpen() {
      this.clearCloseTimeout();

      if (this.openTimeout !== null) return;

      this.openTimeout = window.setTimeout(() => {
        this.open = true;
        this.openTimeout = null;
        config.onOpenChange?.(true);
      }, this.openDelay);
    },

    scheduleClose() {
      this.clearOpenTimeout();

      if (this.closeTimeout !== null) return;

      this.closeTimeout = window.setTimeout(() => {
        this.open = false;
        this.closeTimeout = null;
        config.onOpenChange?.(false);
      }, this.closeDelay);
    },

    clearOpenTimeout() {
      if (this.openTimeout !== null) {
        clearTimeout(this.openTimeout);
        this.openTimeout = null;
      }
    },

    clearCloseTimeout() {
      if (this.closeTimeout !== null) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
    },

    handleTriggerEnter() {
      this.scheduleOpen();
    },

    handleTriggerLeave() {
      this.scheduleClose();
    },

    handleContentEnter() {
      this.clearCloseTimeout();
    },

    handleContentLeave() {
      this.scheduleClose();
    },

    forceOpen() {
      this.clearOpenTimeout();
      this.clearCloseTimeout();
      this.open = true;
      config.onOpenChange?.(true);
    },

    forceClose() {
      this.clearOpenTimeout();
      this.clearCloseTimeout();
      this.open = false;
      config.onOpenChange?.(false);
    },

    cleanup() {
      this.clearOpenTimeout();
      this.clearCloseTimeout();
    }
  };
}
