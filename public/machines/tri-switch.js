// src/machines/tri-switch.ts
function createTriSwitch(config = {}) {
  const sequence = config.sequence && config.sequence.length ? config.sequence : ["off", "mixed", "on"];
  const defaultState = config.defaultState ?? sequence[0] ?? "off";
  return {
    state: defaultState,
    disabled: config.disabled ?? false,
    toggle() {
      if (this.disabled)
        return;
      const idx = sequence.indexOf(this.state);
      const next = sequence[(idx + 1) % sequence.length] ?? sequence[0];
      this.state = next;
      config.onChange?.(this.state);
    },
    setState(next) {
      if (this.disabled)
        return;
      if (!sequence.includes(next))
        return;
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
        ...this.disabled ? { "data-disabled": "" } : {},
        "@click": () => this.toggle(),
        "@keydown.space.prevent": () => this.toggle(),
        "@keydown.enter.prevent": () => this.toggle()
      };
    },
    labelProps() {
      return {
        "@click.prevent": () => this.toggle(),
        "data-state": this.state,
        ...this.disabled ? { "data-disabled": "" } : {}
      };
    }
  };
}
export {
  createTriSwitch as default
};
