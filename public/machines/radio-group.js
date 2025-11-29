// src/machines/radio-group.ts
function createRadioGroup(config = {}) {
  const { defaultValue = "", disabled = false } = config;
  return {
    value: defaultValue,
    disabled,
    select(id) {
      if (this.disabled)
        return;
      this.value = id;
      config.onChange?.(id);
    },
    isChecked(id) {
      return this.value === id;
    },
    get state() {
      return this.value;
    },
    optionProps(id) {
      const isChecked = this.isChecked(id);
      const isDisabled = this.disabled;
      return {
        role: "radio",
        name: config.name,
        "aria-checked": isChecked.toString(),
        "aria-disabled": isDisabled ? "true" : "false",
        tabindex: isChecked ? "0" : "-1",
        "data-state": isChecked ? "checked" : "unchecked",
        "data-disabled": isDisabled ? "" : undefined,
        "@click": () => this.select(id),
        "@keydown.space.prevent": () => this.select(id),
        "@keydown.enter.prevent": () => this.select(id)
      };
    },
    inputProps(id) {
      return {
        type: "radio",
        name: config.name,
        value: id,
        checked: this.isChecked(id),
        disabled: this.disabled,
        "aria-hidden": "true",
        tabindex: -1,
        "@change.prevent.stop": () => this.select(id)
      };
    },
    labelProps(id) {
      return {
        "@click.prevent": () => this.select(id),
        "data-state": this.isChecked(id) ? "checked" : "unchecked",
        "data-disabled": this.disabled ? "" : undefined
      };
    }
  };
}
export {
  createRadioGroup as default
};
