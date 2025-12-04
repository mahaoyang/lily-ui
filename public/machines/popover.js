// src/machines/popover.ts
function createPopover(options = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    size = "2",
    side = "bottom",
    align = "start",
    sideOffset = 8,
    onOpenChange
  } = options;
  return {
    open: defaultOpen,
    triggerEl: null,
    contentEl: null,
    position: { top: 0, left: 0 },
    size,
    side,
    align,
    sideOffset,
    init() {
      const updateOnChange = () => {
        if (this.open)
          this.updatePosition();
      };
      window.addEventListener("resize", updateOnChange);
      window.addEventListener("scroll", updateOnChange, true);
    },
    updatePosition() {
      if (!this.triggerEl || !this.contentEl)
        return;
      const triggerRect = this.triggerEl.getBoundingClientRect();
      const contentRect = this.contentEl.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      let top = 0;
      let left = 0;
      let actualSide = this.side;
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewport.height - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewport.width - triggerRect.right;
      if (actualSide === "bottom" && spaceBelow < contentRect.height + this.sideOffset && spaceAbove > contentRect.height + this.sideOffset) {
        actualSide = "top";
      } else if (actualSide === "top" && spaceAbove < contentRect.height + this.sideOffset && spaceBelow > contentRect.height + this.sideOffset) {
        actualSide = "bottom";
      } else if (actualSide === "right" && spaceRight < contentRect.width + this.sideOffset && spaceLeft > contentRect.width + this.sideOffset) {
        actualSide = "left";
      } else if (actualSide === "left" && spaceLeft < contentRect.width + this.sideOffset && spaceRight > contentRect.width + this.sideOffset) {
        actualSide = "right";
      }
      switch (actualSide) {
        case "top":
          top = triggerRect.top - contentRect.height - this.sideOffset;
          break;
        case "bottom":
          top = triggerRect.bottom + this.sideOffset;
          break;
        case "left":
          left = triggerRect.left - contentRect.width - this.sideOffset;
          break;
        case "right":
          left = triggerRect.right + this.sideOffset;
          break;
      }
      if (actualSide === "top" || actualSide === "bottom") {
        switch (this.align) {
          case "start":
            left = triggerRect.left;
            break;
          case "center":
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
            break;
          case "end":
            left = triggerRect.right - contentRect.width;
            break;
        }
      } else {
        switch (this.align) {
          case "start":
            top = triggerRect.top;
            break;
          case "center":
            top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
            break;
          case "end":
            top = triggerRect.bottom - contentRect.height;
            break;
        }
      }
      left = Math.max(8, Math.min(left, viewport.width - contentRect.width - 8));
      top = Math.max(8, Math.min(top, viewport.height - contentRect.height - 8));
      this.position = { top, left };
    },
    show() {
      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
        this.$nextTick(() => {
          this.updatePosition();
          this.contentEl?.focus?.();
        });
      }
    },
    hide() {
      if (this.open) {
        this.open = false;
        onOpenChange?.(false);
        this.triggerEl?.focus?.({ preventScroll: true });
      }
    },
    toggle() {
      if (this.open) {
        this.hide();
      } else {
        this.show();
      }
    },
    triggerProps() {
      return {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": this.open,
        "aria-controls": id,
        "@click": "toggle()",
        "x-init": "triggerEl = $el"
      };
    },
    contentProps() {
      return {
        role: "dialog",
        tabindex: "-1",
        id,
        "x-effect": "contentEl = $el; if (open) updatePosition()",
        "@keydown.escape.window": closeOnEscape ? "hide()" : undefined,
        "@click.outside": closeOnOutsideClick ? "hide()" : undefined,
        ":style": `{ position: 'fixed', top: position.top + 'px', left: position.left + 'px', zIndex: 9999 }`
      };
    },
    closeProps() {
      return {
        type: "button",
        "aria-label": "Close popover",
        "@click": "hide()"
      };
    }
  };
}
export {
  createPopover
};
