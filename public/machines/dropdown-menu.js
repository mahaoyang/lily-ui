// src/machines/dropdown-menu.ts
function createDropdownMenu(options = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    closeOnSelect = true,
    size = "2",
    variant = "solid",
    onOpenChange,
    onSelect
  } = options;
  return {
    open: defaultOpen,
    highlightedIndex: -1,
    items: [],
    size,
    variant,
    init() {
      this.$nextTick(() => {
        this.updateItems();
      });
    },
    updateItems() {
      const content = this.$refs.content;
      if (content) {
        this.items = Array.from(content.querySelectorAll('[role="menuitem"]:not([data-disabled])'));
      }
    },
    show() {
      if (!this.open) {
        this.open = true;
        this.highlightedIndex = -1;
        this.updateItems();
        this.$nextTick(() => {
          if (this.items.length > 0) {
            this.highlightedIndex = 0;
            this.items[0]?.focus();
          }
        });
        onOpenChange?.(true);
      }
    },
    hide() {
      if (this.open) {
        this.open = false;
        this.highlightedIndex = -1;
        onOpenChange?.(false);
      }
    },
    toggle() {
      if (this.open) {
        this.hide();
      } else {
        this.show();
      }
    },
    handleKeyDown(event) {
      if (!this.open)
        return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          this.highlightNext();
          break;
        case "ArrowUp":
          event.preventDefault();
          this.highlightPrev();
          break;
        case "Home":
          event.preventDefault();
          this.highlightFirst();
          break;
        case "End":
          event.preventDefault();
          this.highlightLast();
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          this.selectHighlighted();
          break;
        case "Escape":
          if (closeOnEscape) {
            event.preventDefault();
            this.hide();
          }
          break;
      }
    },
    highlightNext() {
      if (this.items.length === 0)
        return;
      this.highlightedIndex = (this.highlightedIndex + 1) % this.items.length;
      this.items[this.highlightedIndex]?.focus();
    },
    highlightPrev() {
      if (this.items.length === 0)
        return;
      this.highlightedIndex = this.highlightedIndex <= 0 ? this.items.length - 1 : this.highlightedIndex - 1;
      this.items[this.highlightedIndex]?.focus();
    },
    highlightFirst() {
      if (this.items.length === 0)
        return;
      this.highlightedIndex = 0;
      this.items[0]?.focus();
    },
    highlightLast() {
      if (this.items.length === 0)
        return;
      this.highlightedIndex = this.items.length - 1;
      this.items[this.highlightedIndex]?.focus();
    },
    selectHighlighted() {
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.items.length) {
        const item = this.items[this.highlightedIndex];
        if (item) {
          const value = item.getAttribute("data-value") || "";
          onSelect?.(value);
          item.click();
          if (closeOnSelect) {
            this.hide();
          }
        }
      }
    },
    selectItem(value) {
      onSelect?.(value);
      if (closeOnSelect) {
        this.hide();
      }
    },
    triggerProps() {
      return {
        type: "button",
        "aria-haspopup": "menu",
        "aria-expanded": this.open,
        "@click": "toggle()"
      };
    },
    contentProps() {
      return {
        role: "menu",
        tabindex: "-1",
        "@keydown": "handleKeyDown($event)",
        "@click.outside": closeOnOutsideClick ? "hide()" : undefined
      };
    },
    itemProps(value, disabled = false) {
      return {
        role: "menuitem",
        tabindex: disabled ? undefined : "0",
        "data-value": value,
        ...disabled ? { "data-disabled": "" } : {},
        "@click": disabled ? undefined : `selectItem('${value}')`,
        "@mouseenter": disabled ? undefined : `highlightedIndex = items.indexOf($el)`
      };
    }
  };
}
export {
  createDropdownMenu
};
