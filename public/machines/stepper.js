// src/machines/stepper.ts
function createStepper(config = {}) {
  const { defaultValue = 0, min = -Infinity, max = Infinity, step = 1, disabled = false } = config;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  return {
    value: clamp(defaultValue),
    disabled,
    inc() {
      if (this.disabled)
        return;
      this.value = clamp(this.value + step);
      config.onChange?.(this.value);
    },
    dec() {
      if (this.disabled)
        return;
      this.value = clamp(this.value - step);
      config.onChange?.(this.value);
    },
    setValue(next) {
      if (this.disabled)
        return;
      this.value = clamp(next);
      config.onChange?.(this.value);
    },
    inputProps() {
      return {
        type: "number",
        value: this.value,
        min,
        max,
        step,
        disabled: this.disabled || undefined,
        "x-model.number": "value",
        "@input": (e) => {
          const v = Number(e.target.value);
          this.setValue(v);
        },
        "@change": (e) => {
          const v = Number(e.target.value);
          this.setValue(v);
        }
      };
    }
  };
}
export {
  createStepper as default
};
