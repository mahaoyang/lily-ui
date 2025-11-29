interface ProgressConfig {
  defaultValue?: number;
  max?: number;
  onChange?: (value: number) => void;
}

export default function createProgress(config: ProgressConfig = {}) {
  const { defaultValue = 0, max = 100 } = config;
  const clamp = (v: number) => Math.min(max, Math.max(0, v));

  return {
    value: clamp(defaultValue),
    max,

    setValue(v: number) {
      this.value = clamp(v);
      config.onChange?.(this.value);
    },

    percent() {
      return Math.round((this.value / this.max) * 100);
    },
  };
}
