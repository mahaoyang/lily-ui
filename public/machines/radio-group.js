// src/machines/radio-group.ts
function createRadioGroup(config = {}) {
  const { defaultValue = "", disabled = false, options = [] } = config;
  const optionOrder = new Set(options);
  const escapeAttr = (id) => id.replace(/"/g, "\\\"");
  const ensureOption = (id) => {
    if (!optionOrder.has(id)) {
      optionOrder.add(id);
    }
  };
  const ids = () => Array.from(optionOrder);
  return {
    value: defaultValue,
    disabled,
    select(id) {
      if (this.disabled)
        return;
      this.value = id;
      config.onChange?.(id);
    },
    isChecked(id) {
      return this.value === id;
    },
    get state() {
      return this.value;
    },
    focusNext(currentId) {
      const list = ids();
      if (list.length === 0)
        return;
      const currentIndex = Math.max(0, list.indexOf(currentId));
      const nextIndex = (currentIndex + 1) % list.length;
      const nextId = list[nextIndex];
      this.select(nextId);
      this.focusOption(nextId);
    },
    focusPrev(currentId) {
      const list = ids();
      if (list.length === 0)
        return;
      const currentIndex = Math.max(0, list.indexOf(currentId));
      const prevIndex = currentIndex === 0 ? list.length - 1 : currentIndex - 1;
      const prevId = list[prevIndex];
      this.select(prevId);
      this.focusOption(prevId);
    },
    focusOption(id) {
      const root = this?.$root;
      const el = root?.querySelector('[data-radio-id="' + escapeAttr(id) + '"]');
      el?.focus();
    },
    groupProps() {
      return {
        role: "radiogroup",
        "aria-disabled": this.disabled || undefined
      };
    },
    optionProps(id) {
      ensureOption(id);
      return {
        role: "radio",
        name: config.name,
        "data-radio-id": id,
        "aria-checked": this.isChecked(id),
        "aria-disabled": this.disabled || undefined,
        "data-state": this.isChecked(id) ? "checked" : "unchecked",
        tabindex: this.disabled ? -1 : this.isChecked(id) ? 0 : -1,
        "@click": () => this.select(id),
        "@keydown.space.prevent": () => this.select(id),
        "@keydown.enter.prevent": () => this.select(id),
        "@keydown.arrow-right.prevent": () => this.focusNext(id),
        "@keydown.arrow-down.prevent": () => this.focusNext(id),
        "@keydown.arrow-left.prevent": () => this.focusPrev(id),
        "@keydown.arrow-up.prevent": () => this.focusPrev(id)
      };
    },
    inputProps(id) {
      return {
        type: "radio",
        name: config.name,
        value: id,
        checked: this.isChecked(id),
        disabled: this.disabled || undefined,
        tabindex: -1,
        "@change.prevent.stop": () => this.select(id)
      };
    },
    labelProps(id) {
      return {
        "@click.prevent": () => this.select(id),
        "data-state": this.isChecked(id) ? "checked" : "unchecked",
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    }
  };
}
export {
  createRadioGroup as default
};
