// src/machines/switch.ts
function createSwitch(config = {}) {
  const { defaultChecked = false, disabled = false } = config;
  return {
    checked: defaultChecked,
    disabled,
    get state() {
      return this.checked ? "checked" : "unchecked";
    },
    toggle() {
      if (this.disabled)
        return;
      this.checked = !this.checked;
      config.onChange?.(this.checked);
    },
    setChecked(next) {
      if (this.disabled)
        return;
      this.checked = !!next;
      config.onChange?.(this.checked);
    },
    switchProps() {
      const isDisabled = this.disabled;
      const isChecked = this.checked;
      return {
        role: "switch",
        "aria-checked": isChecked.toString(),
        "aria-disabled": isDisabled ? "true" : undefined,
        tabindex: isDisabled ? "-1" : "0",
        "data-state": isChecked ? "checked" : "unchecked",
        "data-disabled": isDisabled ? "" : undefined,
        "@click": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle()
      };
    },
    labelProps() {
      return {
        for: config.id,
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    },
    inputProps() {
      const isChecked = this.checked;
      return {
        id: config.id,
        type: "checkbox",
        name: config.id,
        "aria-hidden": "true",
        tabindex: -1,
        checked: isChecked,
        disabled: this.disabled || undefined,
        "@change.prevent.stop": () => this.toggle()
      };
    }
  };
}
export {
  createSwitch as default
};
