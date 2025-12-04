// src/machines/checkbox.ts
function createCheckbox(config = {}) {
  const { defaultChecked = false, defaultIndeterminate = false, disabled = false, indeterminateNext = "checked" } = config;
  return {
    checked: defaultChecked,
    indeterminate: defaultIndeterminate,
    disabled,
    get state() {
      if (this.indeterminate)
        return "indeterminate";
      return this.checked ? "checked" : "unchecked";
    },
    toggle() {
      if (this.disabled)
        return;
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = indeterminateNext === "checked";
      } else {
        this.checked = !this.checked;
      }
      config.onChange?.(this.checked, this.indeterminate);
    },
    setChecked(next, opts) {
      if (this.disabled)
        return;
      this.checked = !!next;
      this.indeterminate = !!opts?.indeterminate;
      config.onChange?.(this.checked, this.indeterminate);
    },
    setIndeterminate(next) {
      if (this.disabled)
        return;
      this.indeterminate = !!next;
      config.onChange?.(this.checked, this.indeterminate);
    },
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
        "@keydown.enter.prevent": () => this.toggle()
      };
    },
    inputProps() {
      const isChecked = this.checked;
      return {
        id: config.id,
        type: "checkbox",
        name: config.name ?? config.id,
        checked: isChecked,
        tabindex: -1,
        "@change.prevent.stop": () => this.toggle()
      };
    },
    labelProps() {
      return {
        for: config.id,
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    }
  };
}
export {
  createCheckbox as default
};
