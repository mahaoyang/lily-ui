interface ComboOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ComboboxConfig {
  options: ComboOption[];
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export default function createCombobox(config: ComboboxConfig) {
  const { options, defaultValue, onChange } = config;
  const enabled = options.filter((o) => !o.disabled);
  const initial = defaultValue ?? enabled[0]?.id ?? "";

  return {
    open: false,
    query: "",
    value: initial,
    highlightId: initial,

    filtered() {
      const q = this.query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    },

    setValue(id: string) {
      const opt = options.find((o) => o.id === id && !o.disabled);
      if (!opt) return;
      this.value = id;
      this.highlightId = id;
      this.query = opt.label;
      onChange?.(id);
      this.open = false;
    },

    moveHighlight(step: number) {
      const list = this.filtered().filter((o) => !o.disabled);
      if (!list.length) return;
      const idx = list.findIndex((o) => o.id === this.highlightId);
      const nextIdx = idx === -1 ? 0 : (idx + step + list.length) % list.length;
      this.highlightId = list[nextIdx].id;
      this.query = list[nextIdx].label;
    },

    inputProps() {
      return {
        role: "combobox",
        "aria-expanded": this.open.toString(),
        "aria-controls": "combobox-list",
        value: this.query || this.filtered().find((o) => o.id === this.value)?.label || "",
        "@focus": () => (this.open = true),
        "@click": () => (this.open = true),
        "@input": (e: Event) => {
          this.query = (e.target as HTMLInputElement).value;
          this.open = true;
        },
        "@keydown.arrow-down.prevent": () => {
          this.open = true;
          this.moveHighlight(1);
        },
        "@keydown.arrow-up.prevent": () => {
          this.open = true;
          this.moveHighlight(-1);
        },
        "@keydown.enter.prevent": () => this.setValue(this.highlightId),
        "@keydown.escape.prevent": () => (this.open = false),
      };
    },

    listProps() {
      return {
        id: "combobox-list",
        role: "listbox",
        "x-show": this.open && this.filtered().length > 0,
        "@click.outside": () => (this.open = false),
      };
    },

    optionProps(id: string) {
      const opt = options.find((o) => o.id === id);
      const highlighted = this.highlightId === id;
      const disabled = opt?.disabled ?? false;
      return {
        role: "option",
        "aria-selected": highlighted.toString(),
        "aria-disabled": disabled ? "true" : "false",
        "data-highlighted": highlighted ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        "@mouseenter": () => {
          if (!disabled) this.highlightId = id;
        },
        "@click.prevent": () => this.setValue(id),
      };
    },
  };
}
