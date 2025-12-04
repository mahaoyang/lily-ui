// src/machines/tooltip.ts
var tooltipIdCounter = 0;
function createTooltip(options = {}) {
  const {
    side = "top",
    delayDuration = 700,
    hideDelay = 0,
    sideOffset = 4,
    id,
    onOpenChange
  } = options;
  let showTimer = null;
  let hideTimer = null;
  const contentId = id ?? `tooltip-${++tooltipIdCounter}`;
  return {
    open: false,
    side,
    sideOffset,
    show() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
      }
    },
    hide() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (this.open) {
        this.open = false;
        onOpenChange?.(false);
      }
    },
    scheduleShow() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (showTimer)
        return;
      showTimer = window.setTimeout(() => {
        this.show();
        showTimer = null;
      }, delayDuration);
    },
    scheduleHide() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (!this.open)
        return;
      if (hideDelay > 0) {
        hideTimer = window.setTimeout(() => {
          this.hide();
          hideTimer = null;
        }, hideDelay);
      } else {
        this.hide();
      }
    },
    hideImmediately() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      this.hide();
    },
    triggerProps() {
      return {
        "aria-describedby": this.open ? contentId : undefined
      };
    },
    contentProps() {
      return {
        id: contentId,
        role: "tooltip"
      };
    },
    cleanup() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }
  };
}
export {
  createTooltip
};
