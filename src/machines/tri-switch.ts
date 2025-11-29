type TriState = "off" | "mixed" | "on";

interface TriSwitchConfig {
  defaultState?: TriState;
  sequence?: TriState[];
  disabled?: boolean;
  onChange?: (state: TriState) => void;
}

export default function createTriSwitch(config: TriSwitchConfig = {}) {
  const sequence = config.sequence && config.sequence.length ? config.sequence : (["off", "mixed", "on"] as TriState[]);
  const defaultState = config.defaultState ?? sequence[0] ?? "off";

  return {
    state: defaultState as TriState,
    disabled: config.disabled ?? false,

    toggle() {
      if (this.disabled) return;
      const idx = sequence.indexOf(this.state);
      const next = sequence[(idx + 1) % sequence.length] ?? sequence[0];
      this.state = next as TriState;
      config.onChange?.(this.state);
    },

    setState(next: TriState) {
      if (this.disabled) return;
      if (!sequence.includes(next)) return;
      this.state = next;
      config.onChange?.(this.state);
    },

    switchProps() {
      const ariaChecked = this.state === "on" ? "true" : this.state === "mixed" ? "mixed" : "false";
      return {
        role: "switch",
        "aria-checked": ariaChecked,
        "aria-disabled": this.disabled ? "true" : undefined,
        tabindex: this.disabled ? "-1" : "0",
        "data-state": this.state,
        "data-disabled": this.disabled ? "" : undefined,
        "@click": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle(),
      };
    },

    labelProps() {
      return {
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        "data-disabled": this.disabled ? "" : undefined,
      };
    },
  };
}
