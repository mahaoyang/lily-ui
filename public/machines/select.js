// src/machines/select.ts
var selectIdCounter = 0;
function isGrouped(items) {
  return items.length > 0 && "options" in items[0];
}
function flattenOptions(items) {
  if (isGrouped(items)) {
    return items.flatMap((g) => g.options);
  }
  return items;
}
function createSelect(config) {
  const {
    items,
    defaultValue = "",
    placeholder = "Select...",
    disabled = false,
    onChange,
    id,
    labelId
  } = config;
  const allOptions = flattenOptions(items);
  const enabledOptions = allOptions.filter((o) => !o.disabled);
  const instanceId = id || `select-${++selectIdCounter}`;
  const listboxId = `${instanceId}-listbox`;
  const sanitize = (value) => value.replace(/[^a-zA-Z0-9_-]/g, "-");
  const getOptionId = (value) => `${instanceId}-option-${sanitize(value)}`;
  return {
    open: false,
    value: defaultValue,
    highlightedValue: defaultValue || enabledOptions[0]?.value || "",
    disabled,
    placeholder,
    items,
    get selectedOption() {
      return allOptions.find((o) => o.value === this.value);
    },
    get displayValue() {
      return this.selectedOption?.label || "";
    },
    get hasValue() {
      return this.value !== "";
    },
    openMenu() {
      if (this.disabled)
        return;
      this.open = true;
      this.highlightedValue = this.value || enabledOptions[0]?.value || "";
      this.$nextTick?.(() => {
        const content = this?.$refs?.content;
        content?.focus();
      });
    },
    closeMenu() {
      this.open = false;
    },
    toggle() {
      if (this.open) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    },
    select(value) {
      const option = allOptions.find((o) => o.value === value);
      if (!option || option.disabled)
        return;
      this.value = value;
      this.highlightedValue = value;
      onChange?.(value);
      this.closeMenu();
    },
    highlightOption(value) {
      const option = allOptions.find((o) => o.value === value);
      if (option && !option.disabled) {
        this.highlightedValue = value;
      }
    },
    highlightNext() {
      const currentIndex = enabledOptions.findIndex((o) => o.value === this.highlightedValue);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabledOptions.length;
      this.highlightedValue = enabledOptions[nextIndex]?.value || "";
    },
    highlightPrev() {
      const currentIndex = enabledOptions.findIndex((o) => o.value === this.highlightedValue);
      const prevIndex = currentIndex <= 0 ? enabledOptions.length - 1 : currentIndex - 1;
      this.highlightedValue = enabledOptions[prevIndex]?.value || "";
    },
    highlightFirst() {
      this.highlightedValue = enabledOptions[0]?.value || "";
    },
    highlightLast() {
      this.highlightedValue = enabledOptions[enabledOptions.length - 1]?.value || "";
    },
    selectHighlighted() {
      if (this.highlightedValue) {
        this.select(this.highlightedValue);
      }
    },
    onTriggerKeydown(event) {
      switch (event.key) {
        case "Enter":
        case " ":
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          this.openMenu();
          break;
      }
    },
    onContentKeydown(event) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          this.highlightNext();
          break;
        case "ArrowUp":
          event.preventDefault();
          this.highlightPrev();
          break;
        case "Home":
          event.preventDefault();
          this.highlightFirst();
          break;
        case "End":
          event.preventDefault();
          this.highlightLast();
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          this.selectHighlighted();
          break;
        case "Escape":
          event.preventDefault();
          this.closeMenu();
          break;
        case "Tab":
          this.closeMenu();
          break;
      }
    },
    triggerProps() {
      return {
        role: "combobox",
        "aria-haspopup": "listbox",
        "aria-expanded": this.open,
        "aria-controls": listboxId,
        "aria-activedescendant": this.open && this.highlightedValue ? getOptionId(this.highlightedValue) : undefined,
        "aria-disabled": this.disabled || undefined,
        "aria-labelledby": labelId,
        "data-state": this.open ? "open" : "closed",
        "data-placeholder": this.hasValue ? undefined : ""
      };
    },
    contentProps() {
      return {
        role: "listbox",
        tabindex: -1,
        id: listboxId,
        "aria-labelledby": labelId,
        "data-state": this.open ? "open" : "closed",
        "x-ref": "content",
        "@click.outside": "closeMenu()"
      };
    },
    itemProps(value) {
      const option = allOptions.find((o) => o.value === value);
      const isDisabled = option?.disabled || false;
      return {
        role: "option",
        "aria-disabled": isDisabled,
        "aria-selected": this.isSelected(value),
        id: getOptionId(value),
        "data-state": this.isSelected(value) ? "checked" : "unchecked"
      };
    },
    isSelected(value) {
      return this.value === value;
    },
    isHighlighted(value) {
      return this.highlightedValue === value;
    },
    isItemDisabled(value) {
      const option = allOptions.find((o) => o.value === value);
      return option?.disabled || false;
    },
    isGroupedItems() {
      return isGrouped(items);
    },
    getGroups() {
      if (isGrouped(items)) {
        return items;
      }
      return [];
    },
    getOptions() {
      if (isGrouped(items)) {
        return [];
      }
      return items;
    }
  };
}
export {
  createSelect as default
};
