// src/machines/progress.ts
function createProgress(config = {}) {
  const { defaultValue = 0, max = 100 } = config;
  const clamp = (v) => Math.min(max, Math.max(0, v));
  return {
    value: clamp(defaultValue),
    max,
    setValue(v) {
      this.value = clamp(v);
      config.onChange?.(this.value);
    },
    percent() {
      return Math.round(this.value / this.max * 100);
    }
  };
}
export {
  createProgress as default
};
