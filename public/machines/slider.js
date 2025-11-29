// src/machines/slider.ts
function createSlider(config = {}) {
  const { defaultValue = 50, min = 0, max = 100, step = 1, disabled = false } = config;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  return {
    value: clamp(defaultValue),
    min,
    max,
    step,
    disabled,
    setValue(next) {
      if (this.disabled)
        return;
      this.value = clamp(next);
      config.onChange?.(this.value);
    },
    inputProps() {
      return {
        type: "range",
        min: this.min,
        max: this.max,
        step: this.step,
        disabled: this.disabled || undefined
      };
    }
  };
}
export {
  createSlider as default
};
