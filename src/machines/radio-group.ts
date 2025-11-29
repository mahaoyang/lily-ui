interface RadioGroupConfig {
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
}

export default function createRadioGroup(config: RadioGroupConfig = {}) {
  const { defaultValue = "", disabled = false } = config;

  return {
    value: defaultValue,
    disabled,

    select(id: string) {
      if (this.disabled) return;
      this.value = id;
      config.onChange?.(id);
    },

    isChecked(id: string) {
      return this.value === id;
    },

    get state() {
      return this.value;
    },

    optionProps(id: string) {
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
        "@keydown.enter.prevent": () => this.select(id),
      };
    },

    inputProps(id: string) {
      return {
        type: "radio",
        name: config.name,
        value: id,
        checked: this.isChecked(id),
        disabled: this.disabled,
        "aria-hidden": "true",
        tabindex: -1,
        "@change.prevent.stop": () => this.select(id),
      };
    },

    labelProps(id: string) {
      return {
        "@click.prevent": () => this.select(id),
        "data-state": this.isChecked(id) ? "checked" : "unchecked",
        "data-disabled": this.disabled ? "" : undefined,
      };
    },
  };
}
