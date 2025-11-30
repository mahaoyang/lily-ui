// src/machines/segmented-control.ts
function createSegmentedControl(config = {}) {
  const { defaultValue = "", disabled = false } = config;
  let items = [];
  return {
    value: defaultValue,
    disabled,
    registerItems(itemValues) {
      items = itemValues;
    },
    select(value) {
      if (this.disabled)
        return;
      this.value = value;
      config.onChange?.(value);
    },
    isSelected(value) {
      return this.value === value;
    },
    getSelectedIndex() {
      return items.indexOf(this.value);
    },
    getTotalItems() {
      return items.length;
    },
    handleKeydown(event, currentValue) {
      if (this.disabled)
        return;
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
        "data-disabled": this.disabled ? "" : undefined
      };
    },
    itemProps(value) {
      const isSelected = this.isSelected(value);
      return {
        role: "radio",
        type: "button",
        "data-state": isSelected ? "on" : "off",
        "data-disabled": this.disabled ? "" : undefined,
        "aria-checked": isSelected.toString(),
        tabindex: isSelected ? 0 : -1,
        "@click": () => this.select(value),
        "@keydown": (e) => this.handleKeydown(e, value)
      };
    }
  };
}
export {
  createSegmentedControl as default
};
