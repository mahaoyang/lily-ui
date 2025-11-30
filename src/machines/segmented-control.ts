interface SegmentedControlConfig {
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export default function createSegmentedControl(config: SegmentedControlConfig = {}) {
  const { defaultValue = "", disabled = false } = config;

  let items: string[] = [];

  return {
    value: defaultValue,
    disabled,

    registerItems(itemValues: string[]) {
      items = itemValues;
    },

    select(value: string) {
      if (this.disabled) return;
      this.value = value;
      config.onChange?.(value);
    },

    isSelected(value: string) {
      return this.value === value;
    },

    getSelectedIndex() {
      return items.indexOf(this.value);
    },

    getTotalItems() {
      return items.length;
    },

    handleKeydown(event: KeyboardEvent, currentValue: string) {
      if (this.disabled) return;

      const currentIndex = items.indexOf(currentValue);
      let newIndex = currentIndex;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      this.select(items[newIndex]);
    },

    rootProps() {
      return {
        role: "radiogroup",
        "data-disabled": this.disabled ? "" : undefined,
      };
    },

    itemProps(value: string) {
      const isSelected = this.isSelected(value);
      return {
        role: "radio",
        type: "button",
        "data-state": isSelected ? "on" : "off",
        "data-disabled": this.disabled ? "" : undefined,
        "aria-checked": isSelected.toString(),
        tabindex: isSelected ? 0 : -1,
        "@click": () => this.select(value),
        "@keydown": (e: KeyboardEvent) => this.handleKeydown(e, value),
      };
    },
  };
}
