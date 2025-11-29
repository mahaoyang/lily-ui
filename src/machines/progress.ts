interface ProgressConfig {
  value?: number | null;
  max?: number;
  onChange?: (value: number) => void;
}

export default function createProgress(config: ProgressConfig = {}) {
  const { value: initialValue = null, max = 100 } = config;
  const clamp = (v: number) => Math.min(max, Math.max(0, v));

  return {
    value: initialValue !== null ? clamp(initialValue) : null,
    max,

    get indeterminate() {
      return this.value === null;
    },

    get percent() {
      if (this.value === null) return 0;
      return Math.round((this.value / this.max) * 100);
    },

    get dataState() {
      return this.value === null ? "indeterminate" : "complete";
    },

    setValue(v: number | null) {
      if (v === null) {
        this.value = null;
      } else {
        this.value = clamp(v);
        config.onChange?.(this.value);
      }
    },

    rootProps() {
      return {
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": this.max,
        "aria-valuenow": this.value ?? undefined,
      };
    },
  };
}
