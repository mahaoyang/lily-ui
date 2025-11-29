interface SwitchConfig {
  defaultChecked?: boolean;
  disabled?: boolean;
  id?: string;
  onChange?: (checked: boolean) => void;
}

export default function createSwitch(config: SwitchConfig = {}) {
  const { defaultChecked = false, disabled = false } = config;

  return {
    // 状态
    // 注意：Alpine 表达式中不要使用保留字作为 data 名称，建议 `switchMachine`。
    checked: defaultChecked,
    disabled,

    // 计算属性
    get state() {
      return this.checked ? "checked" : "unchecked";
    },

    // 动作
    toggle() {
      if (this.disabled) return;
      this.checked = !this.checked;
      config.onChange?.(this.checked);
    },
    setChecked(next: boolean) {
      if (this.disabled) return;
      this.checked = !!next;
      config.onChange?.(this.checked);
    },

    // 属性生成器
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
        "@keydown.enter.prevent": () => this.toggle(),
      };
    },

    labelProps() {
      return {
        for: config.id,
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        "data-disabled": this.disabled ? "" : undefined,
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
        "@change.prevent.stop": () => this.toggle(),
      };
    },
  };
}
