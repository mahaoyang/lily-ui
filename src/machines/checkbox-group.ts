interface CheckboxGroupConfig {
  name?: string;
  defaultValues?: string[];
  disabled?: boolean;
  onChange?: (values: string[]) => void;
}

export default function createCheckboxGroup(config: CheckboxGroupConfig = {}) {
  const { defaultValues = [], disabled = false, name } = config;

  return {
    // State
    values: [...defaultValues],
    disabled,
    name,

    // Computed
    get selectedCount() {
      return this.values.length;
    },

    isChecked(value: string): boolean {
      return this.values.includes(value);
    },

    // Actions
    toggle(value: string) {
      if (this.disabled) return;

      const index = this.values.indexOf(value);
      if (index >= 0) {
        this.values.splice(index, 1);
      } else {
        this.values.push(value);
      }
      config.onChange?.(this.values);
    },

    check(value: string) {
      if (this.disabled) return;
      if (!this.values.includes(value)) {
        this.values.push(value);
        config.onChange?.(this.values);
      }
    },

    uncheck(value: string) {
      if (this.disabled) return;
      const index = this.values.indexOf(value);
      if (index >= 0) {
        this.values.splice(index, 1);
        config.onChange?.(this.values);
      }
    },

    setValues(newValues: string[]) {
      if (this.disabled) return;
      this.values = [...newValues];
      config.onChange?.(this.values);
    },

    clear() {
      if (this.disabled) return;
      this.values = [];
      config.onChange?.(this.values);
    },

    // Props generators
    rootProps() {
      return {
        role: "group",
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },

    itemProps(value: string, itemId?: string) {
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
        "@keydown.enter.prevent": () => this.toggle(value),
      };
    },

    inputProps(value: string, itemId?: string) {
      const isChecked = this.isChecked(value);
      return {
        id: itemId,
        type: "checkbox",
        name: this.name,
        value: value,
        checked: isChecked,
        tabindex: -1,
        "@change.prevent.stop": () => this.toggle(value),
      };
    },

    labelProps(value: string, itemId?: string) {
      const isChecked = this.isChecked(value);
      return {
        for: itemId,
        "@click.prevent": () => this.toggle(value),
        "data-state": isChecked ? "checked" : "unchecked",
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },
  };
}
