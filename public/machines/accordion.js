// src/machines/accordion.ts
function createAccordion(config = {}) {
  const { type = "single", defaultValue = [] } = config;
  return {
    openValues: new Set(defaultValue),
    type,
    isOpen(id) {
      return this.openValues.has(id);
    },
    toggle(id) {
      if (this.type === "single") {
        this.openValues = this.isOpen(id) ? new Set : new Set([id]);
      } else {
        if (this.isOpen(id)) {
          this.openValues.delete(id);
        } else {
          this.openValues.add(id);
        }
      }
      config.onChange?.(Array.from(this.openValues));
    },
    triggerProps(id) {
      const open = this.isOpen(id);
      return {
        role: "button",
        "aria-expanded": open.toString(),
        "aria-controls": `${id}-panel`,
        "data-state": open ? "open" : "closed",
        "@click": () => this.toggle(id),
        "@keydown.enter.prevent": () => this.toggle(id),
        "@keydown.space.prevent": () => this.toggle(id)
      };
    },
    contentProps(id) {
      const open = this.isOpen(id);
      return {
        id: `${id}-panel`,
        role: "region",
        "aria-labelledby": id,
        "x-show": open,
        "data-state": open ? "open" : "closed",
        class: open ? "block" : "hidden"
      };
    }
  };
}
export {
  createAccordion as default
};
