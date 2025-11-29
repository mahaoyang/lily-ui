interface SliderConfig {
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

export default function createSlider(config: SliderConfig = {}) {
  const { defaultValue = 50, min = 0, max = 100, step = 1, disabled = false } = config;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return {
    value: clamp(defaultValue),
    min,
    max,
    step,
    disabled,

    setValue(next: number) {
      if (this.disabled) return;
      this.value = clamp(next);
      config.onChange?.(this.value);
    },

    inputProps() {
      return {
        type: "range",
        min: this.min,
        max: this.max,
        step: this.step,
        value: this.value,
        disabled: this.disabled || undefined,
        "x-model.number": "value",
        "@input": (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          this.setValue(v);
        },
        "@change": (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          this.setValue(v);
        },
      };
    },
  };
}
