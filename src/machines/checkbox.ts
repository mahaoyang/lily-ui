interface CheckboxConfig {
  defaultChecked?: boolean;
  defaultIndeterminate?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange?: (checked: boolean, indeterminate: boolean) => void;
  indeterminateNext?: "checked" | "unchecked";
}

export default function createCheckbox(config: CheckboxConfig = {}) {
  const { defaultChecked = false, defaultIndeterminate = false, disabled = false, indeterminateNext = "checked" } =
    config;

  return {
    // 状态
    checked: defaultChecked,
    indeterminate: defaultIndeterminate,
    disabled,

    // 计算属性
    get state() {
      if (this.indeterminate) return "indeterminate";
      return this.checked ? "checked" : "unchecked";
    },

    // 动作
    toggle() {
      if (this.disabled) return;
      // 点击时若是半选，先取消半选并设为选中
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = indeterminateNext === "checked";
      } else {
        this.checked = !this.checked;
      }
      config.onChange?.(this.checked, this.indeterminate);
    },
    setChecked(next: boolean, opts?: { indeterminate?: boolean }) {
      if (this.disabled) return;
      this.checked = !!next;
      this.indeterminate = !!opts?.indeterminate;
      config.onChange?.(this.checked, this.indeterminate);
    },
    setIndeterminate(next: boolean) {
      if (this.disabled) return;
      this.indeterminate = !!next;
      config.onChange?.(this.checked, this.indeterminate);
    },

    // 属性生成器
    controlProps() {
      const isChecked = this.checked;
      const isIndeterminate = this.indeterminate;
      const isDisabled = this.disabled;

      return {
        role: "checkbox",
        "aria-checked": isIndeterminate ? "mixed" : isChecked.toString(),
        "aria-disabled": isDisabled ? "true" : undefined,
        tabindex: isDisabled ? "-1" : "0",
        "data-state": this.state,
        "@click": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle(),
      };
    },

    inputProps() {
      const isChecked = this.checked;
      return {
        id: config.id,
        type: "checkbox",
        name: config.name ?? config.id,
        checked: isChecked,
        "aria-hidden": "true",
        tabindex: -1,
        "@change.prevent.stop": () => this.toggle(),
      };
    },

    labelProps() {
      return {
        for: config.id,
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },
  };
}
