interface RadioGroupConfig {
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  options?: string[];
}

export default function createRadioGroup(config: RadioGroupConfig = {}) {
  const { defaultValue = "", disabled = false, options = [] } = config;
  const optionOrder = new Set<string>(options);
  const escapeAttr = (id: string) => id.replace(/"/g, '\\"');

  const ensureOption = (id: string) => {
    if (!optionOrder.has(id)) {
      optionOrder.add(id);
    }
  };

  const ids = () => Array.from(optionOrder);

  return {
    value: defaultValue,
    disabled,

    select(id: string) {
      if (this.disabled) return;
      this.value = id;
      config.onChange?.(id);
    },

    isChecked(id: string) {
      return this.value === id;
    },

    get state() {
      return this.value;
    },

    focusNext(currentId: string) {
      const list = ids();
      if (list.length === 0) return;
      const currentIndex = Math.max(0, list.indexOf(currentId));
      const nextIndex = (currentIndex + 1) % list.length;
      const nextId = list[nextIndex];
      this.select(nextId);
      this.focusOption(nextId);
    },

    focusPrev(currentId: string) {
      const list = ids();
      if (list.length === 0) return;
      const currentIndex = Math.max(0, list.indexOf(currentId));
      const prevIndex = currentIndex === 0 ? list.length - 1 : currentIndex - 1;
      const prevId = list[prevIndex];
      this.select(prevId);
      this.focusOption(prevId);
    },

    focusOption(id: string) {
      const root = (this as any)?.$root as HTMLElement | undefined;
      const el = root?.querySelector('[data-radio-id="' + escapeAttr(id) + '"]') as HTMLElement | null;
      el?.focus();
    },

    groupProps() {
      return {
        role: "radiogroup",
        "aria-disabled": this.disabled || undefined,
      };
    },

    optionProps(id: string) {
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
        "@keydown.arrow-up.prevent": () => this.focusPrev(id),
      };
    },

    inputProps(id: string) {
      return {
        type: "radio",
        name: config.name,
        value: id,
        checked: this.isChecked(id),
        disabled: this.disabled || undefined,
        tabindex: -1,
        "@change.prevent.stop": () => this.select(id),
      };
    },

    labelProps(id: string) {
      return {
        "@click.prevent": () => this.select(id),
        "data-state": this.isChecked(id) ? "checked" : "unchecked",
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },
  };
}
