// src/machines/slider.ts
function createSlider(config = {}) {
  const {
    defaultValue = 50,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = "horizontal",
    variant = "surface",
    size = "2",
    highContrast = false
  } = config;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  return {
    value: clamp(defaultValue),
    min,
    max,
    step,
    disabled,
    orientation,
    variant,
    size,
    highContrast,
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
    get percentage() {
      return (this.value - this.min) / (this.max - this.min) * 100;
    },
    rootProps() {
      return {
        class: [
          "slider-root",
          `slider-variant-${this.variant}`,
          `slider-size-${this.size}`
        ].join(" "),
        "data-orientation": this.orientation,
        "data-disabled": this.disabled || undefined,
        role: "group"
      };
    },
    trackProps() {
      return {
        class: "slider-track",
        "data-orientation": this.orientation,
        "data-disabled": this.disabled || undefined
      };
    },
    rangeProps() {
      const style = this.orientation === "horizontal" ? { width: `${this.percentage}%` } : { height: `${this.percentage}%` };
      return {
        class: ["slider-range", this.highContrast && "slider-high-contrast"].filter(Boolean).join(" "),
        "data-orientation": this.orientation,
        style
      };
    },
    thumbProps() {
      const style = this.orientation === "horizontal" ? { left: `${this.percentage}%` } : { bottom: `${this.percentage}%` };
      return {
        class: "slider-thumb",
        "data-disabled": this.disabled || undefined,
        tabindex: this.disabled ? -1 : 0,
        role: "slider",
        "aria-valuemin": this.min,
        "aria-valuemax": this.max,
        "aria-valuenow": this.value,
        "aria-orientation": this.orientation,
        "aria-disabled": this.disabled || undefined,
        style
      };
    },
    inputProps() {
      return {
        type: "range",
        min: this.min,
        max: this.max,
        step: this.step,
        disabled: this.disabled || undefined,
        "aria-hidden": "true",
        tabindex: -1,
        class: "sr-only"
      };
    }
  };
}
export {
  createSlider as default
};
