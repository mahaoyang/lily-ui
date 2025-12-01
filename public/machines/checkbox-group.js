// src/machines/checkbox-group.ts
function createCheckboxGroup(config = {}) {
  const { defaultValues = [], disabled = false, name } = config;
  return {
    values: [...defaultValues],
    disabled,
    name,
    get selectedCount() {
      return this.values.length;
    },
    isChecked(value) {
      return this.values.includes(value);
    },
    toggle(value) {
      if (this.disabled)
        return;
      const index = this.values.indexOf(value);
      if (index >= 0) {
        this.values.splice(index, 1);
      } else {
        this.values.push(value);
      }
      config.onChange?.(this.values);
    },
    check(value) {
      if (this.disabled)
        return;
      if (!this.values.includes(value)) {
        this.values.push(value);
        config.onChange?.(this.values);
      }
    },
    uncheck(value) {
      if (this.disabled)
        return;
      const index = this.values.indexOf(value);
      if (index >= 0) {
        this.values.splice(index, 1);
        config.onChange?.(this.values);
      }
    },
    setValues(newValues) {
      if (this.disabled)
        return;
      this.values = [...newValues];
      config.onChange?.(this.values);
    },
    clear() {
      if (this.disabled)
        return;
      this.values = [];
      config.onChange?.(this.values);
    },
    rootProps() {
      return {
        role: "group",
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    },
    itemProps(value, itemId) {
      const isChecked = this.isChecked(value);
      const isDisabled = this.disabled;
      return {
        role: "checkbox",
        "aria-checked": isChecked.toString(),
        "aria-disabled": isDisabled ? "true" : undefined,
        tabindex: isDisabled ? "-1" : "0",
        "data-state": isChecked ? "checked" : "unchecked",
        "data-disabled": isDisabled ? "" : undefined,
        "@click": () => this.toggle(value),
        "@keydown.space.prevent": () => this.toggle(value),
        "@keydown.enter.prevent": () => this.toggle(value)
      };
    },
    inputProps(value, itemId) {
      const isChecked = this.isChecked(value);
      return {
        id: itemId,
        type: "checkbox",
        name: this.name,
        value,
        checked: isChecked,
        "aria-hidden": "true",
        tabindex: -1,
        "@change.prevent.stop": () => this.toggle(value)
      };
    },
    labelProps(value, itemId) {
      const isChecked = this.isChecked(value);
      return {
        for: itemId,
        "@click.prevent": () => this.toggle(value),
        "data-state": isChecked ? "checked" : "unchecked",
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    }
  };
}
export {
  createCheckboxGroup as default
};
