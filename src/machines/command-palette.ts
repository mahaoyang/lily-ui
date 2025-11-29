interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
}

interface CommandPaletteConfig {
  commands: CommandItem[];
  onSelect?: (id: string) => void;
  defaultOpen?: boolean;
}

export default function createCommandPalette(config: CommandPaletteConfig) {
  const { commands, onSelect, defaultOpen = false } = config;

  return {
    open: defaultOpen,
    query: "",
    highlightId: commands[0]?.id ?? null,

    filtered() {
      const q = this.query.trim().toLowerCase();
      if (!q) return commands;
      return commands.filter((c) => c.label.toLowerCase().includes(q));
    },

    toggle() {
      this.open = !this.open;
    },
    close() {
      this.open = false;
    },
    openPalette() {
      this.open = true;
    },

    moveHighlight(step: number) {
      const list = this.filtered();
      if (!list.length) return;
      const idx = list.findIndex((c) => c.id === this.highlightId);
      const next = idx === -1 ? 0 : (idx + step + list.length) % list.length;
      this.highlightId = list[next].id;
    },

    select(id: string) {
      const cmd = commands.find((c) => c.id === id);
      if (!cmd) return;
      this.highlightId = id;
      onSelect?.(id);
      this.close();
    },

    triggerProps() {
      return {
        "@click": () => this.openPalette(),
      };
    },

    overlayProps() {
      return {
        "x-show": this.open,
        class: "fixed inset-0 bg-black/40",
        "@click": () => this.close(),
      };
    },

    panelProps() {
      return {
        "x-show": this.open,
        "@keydown.escape.window": () => this.close(),
        "@keydown.arrow-down.prevent": () => this.moveHighlight(1),
        "@keydown.arrow-up.prevent": () => this.moveHighlight(-1),
        "@keydown.enter.prevent": () => this.select(this.highlightId as string),
      };
    },

    inputProps() {
      return {
        value: this.query,
        placeholder: "搜索指令...",
        "@input": (e: Event) => {
          this.query = (e.target as HTMLInputElement).value;
          this.open = true;
        },
      };
    },

    itemProps(id: string) {
      const highlighted = this.highlightId === id;
      return {
        role: "option",
        "data-highlighted": highlighted ? "" : undefined,
        "@mouseenter": () => (this.highlightId = id),
        "@click": () => this.select(id),
      };
    },
  };
}
