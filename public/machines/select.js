// src/machines/select.ts
function createSelect(config) {
  const { options, defaultValue, onChange, disabled = false } = config;
  const enabledOptions = options.filter((o) => !o.disabled);
  const initialValue = defaultValue ?? enabledOptions[0]?.id ?? "";
  return {
    open: false,
    value: initialValue,
    highlightId: initialValue,
    disabled,
    currentLabel() {
      const found = options.find((o) => o.id === this.value);
      return found?.label ?? "";
    },
    toggle() {
      if (this.disabled)
        return;
      this.open = !this.open;
    },
    openMenu() {
      if (this.disabled)
        return;
      this.open = true;
    },
    closeMenu() {
      this.open = false;
    },
    select(id) {
      const opt = options.find((o) => o.id === id);
      if (!opt || opt.disabled)
        return;
      this.value = id;
      this.highlightId = id;
      onChange?.(id);
      this.closeMenu();
    },
    moveHighlight(step) {
      const enabled = options.filter((o) => !o.disabled);
      if (!enabled.length)
        return;
      const currentIndex = enabled.findIndex((o) => o.id === this.highlightId);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + step + enabled.length) % enabled.length;
      this.highlightId = enabled[nextIndex].id;
    },
    triggerProps() {
      return {
        role: "combobox",
        "aria-expanded": this.open.toString(),
        "aria-controls": "select-listbox",
        "aria-disabled": this.disabled ? "true" : "false",
        tabindex: this.disabled ? "-1" : "0",
        "@click": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.arrow-down.prevent": () => {
          this.openMenu();
          this.moveHighlight(1);
        },
        "@keydown.arrow-up.prevent": () => {
          this.openMenu();
          this.moveHighlight(-1);
        },
        "@keydown.escape.prevent.stop": () => this.closeMenu()
      };
    },
    listboxProps() {
      return {
        id: "select-listbox",
        role: "listbox",
        "x-show": this.open,
        "@click.outside": () => this.closeMenu()
      };
    },
    optionProps(id) {
      const opt = options.find((o) => o.id === id);
      const isSelected = this.value === id;
      const isDisabled = opt?.disabled ?? false;
      const isHighlighted = this.highlightId === id;
      return {
        role: "option",
        "aria-selected": isSelected.toString(),
        "aria-disabled": isDisabled ? "true" : "false",
        "data-highlighted": isHighlighted ? "" : undefined,
        "data-disabled": isDisabled ? "" : undefined,
        tabindex: isHighlighted ? "0" : "-1",
        "@mouseenter": () => {
          if (!isDisabled)
            this.highlightId = id;
        },
        "@click.prevent": () => this.select(id)
      };
    }
  };
}
export {
  createSelect as default
};
