// src/machines/slider.ts
function createSlider(config = {}) {
  const {
    defaultValue = 50,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = "horizontal"
  } = config;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  return {
    value: clamp(defaultValue),
    min,
    max,
    step,
    disabled,
    orientation,
    dragging: false,
    setValue(next) {
      if (this.disabled)
        return;
      this.value = clamp(next);
      config.onChange?.(this.value);
    },
    onCommit() {
      config.onValueCommit?.(this.value);
    },
    handlePointer(event, startDrag = false) {
      if (this.disabled)
        return;
      const trackEl = this.$refs?.track;
      if (!trackEl)
        return;
      const rect = trackEl.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
      const clientY = "touches" in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
      let ratio = 0;
      if (this.orientation === "horizontal") {
        ratio = (clientX - rect.left) / rect.width;
      } else {
        ratio = 1 - (clientY - rect.top) / rect.height;
      }
      const next = clamp(this.min + ratio * (this.max - this.min));
      this.setValue(Math.round(next / this.step) * this.step);
      if (startDrag)
        this.dragging = true;
    },
    endDrag() {
      if (this.dragging) {
        this.dragging = false;
        this.onCommit();
      }
    },
    get percentage() {
      return (this.value - this.min) / (this.max - this.min) * 100;
    }
  };
}
export {
  createSlider as default
};
