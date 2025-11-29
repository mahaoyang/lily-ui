interface StepperConfig {
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

export default function createStepper(config: StepperConfig = {}) {
  const { defaultValue = 0, min = -Infinity, max = Infinity, step = 1, disabled = false } = config;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return {
    value: clamp(defaultValue),
    disabled,

    inc() {
      if (this.disabled) return;
      this.value = clamp(this.value + step);
      config.onChange?.(this.value);
    },
    dec() {
      if (this.disabled) return;
      this.value = clamp(this.value - step);
      config.onChange?.(this.value);
    },
    setValue(next: number) {
      if (this.disabled) return;
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
