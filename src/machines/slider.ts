interface SliderConfig {
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  variant?: "surface" | "classic" | "soft";
  size?: "1" | "2" | "3";
  highContrast?: boolean;
  onChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
}

export default function createSlider(config: SliderConfig = {}) {
  const {
    defaultValue = 50,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = "horizontal",
    variant = "surface",
    size = "2",
    highContrast = false,
  } = config;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

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

    setValue(next: number) {
      if (this.disabled) return;
      this.value = clamp(next);
      config.onChange?.(this.value);
    },

    onCommit() {
      config.onValueCommit?.(this.value);
    },

    // 计算百分比位置（用于 Range 和 Thumb）
    get percentage() {
      return ((this.value - this.min) / (this.max - this.min)) * 100;
    },

    // Root 元素属性
    rootProps() {
      return {
        class: [
          "slider-root",
          `slider-variant-${this.variant}`,
          `slider-size-${this.size}`,
        ].join(" "),
        "data-orientation": this.orientation,
        "data-disabled": this.disabled || undefined,
        role: "group",
      };
    },

    // Track 元素属性
    trackProps() {
      return {
        class: "slider-track",
        "data-orientation": this.orientation,
        "data-disabled": this.disabled || undefined,
      };
    },

    // Range 元素属性（已填充的部分）
    rangeProps() {
      const style =
        this.orientation === "horizontal"
          ? { width: `${this.percentage}%`, left: "0", top: "0" }
          : { height: `${this.percentage}%`, top: `${100 - this.percentage}%`, left: "0" };

      return {
        class: ["slider-range", this.highContrast && "slider-high-contrast"]
          .filter(Boolean)
          .join(" "),
        "data-orientation": this.orientation,
        style,
      };
    },

    // Thumb 元素属性（滑块）
    thumbProps() {
      const style =
        this.orientation === "horizontal"
          ? { left: `${this.percentage}%`, top: "50%" }
          : { top: `${100 - this.percentage}%`, left: "50%" };

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
        style,
      };
    },

    // 隐藏的原生 input（用于表单集成和键盘操作）
    inputProps() {
      return {
        type: "range",
        min: this.min,
        max: this.max,
        step: this.step,
        disabled: this.disabled || undefined,
        "aria-hidden": "true",
        tabindex: -1,
        class: "sr-only",
      };
    },
  };
}
