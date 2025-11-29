// src/machines/dropdown.ts
function createDropdown(config = {}) {
  const { items = [], defaultOpen = false } = config;
  return {
    open: defaultOpen,
    highlightId: items[0]?.id ?? null,
    toggle() {
      this.open = !this.open;
    },
    openMenu() {
      this.open = true;
    },
    closeMenu() {
      this.open = false;
    },
    select(id) {
      const item = items.find((i) => i.id === id);
      if (!item || item.disabled)
        return;
      config.onSelect?.(id);
      this.closeMenu();
    },
    moveHighlight(step) {
      if (!items.length)
        return;
      const enabled = items.filter((i) => !i.disabled);
      if (!enabled.length)
        return;
      const currentIndex = enabled.findIndex((i) => i.id === this.highlightId);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + step + enabled.length) % enabled.length;
      this.highlightId = enabled[nextIndex].id;
    },
    triggerProps() {
      return {
        role: "button",
        "aria-haspopup": "menu",
        "aria-expanded": this.open.toString(),
        "@click": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.arrow-down.prevent": () => {
          this.open = true;
          this.moveHighlight(1);
        },
        "@keydown.arrow-up.prevent": () => {
          this.open = true;
          this.moveHighlight(-1);
        }
      };
    },
    menuProps() {
      return {
        role: "menu",
        "x-show": this.open,
        "@keydown.escape.stop.prevent": () => this.closeMenu(),
        "@click.outside": () => this.closeMenu()
      };
    },
    itemProps(id) {
      const item = items.find((i) => i.id === id);
      const disabled = item?.disabled ?? false;
      const highlighted = this.highlightId === id;
      return {
        role: "menuitem",
        "aria-disabled": disabled ? "true" : "false",
        "data-disabled": disabled ? "" : undefined,
        "data-highlighted": highlighted ? "" : undefined,
        tabindex: highlighted ? "0" : "-1",
        "@mouseenter": () => {
          if (!disabled)
            this.highlightId = id;
        },
        "@click.prevent": () => this.select(id)
      };
    }
  };
}
export {
  createDropdown as default
};
