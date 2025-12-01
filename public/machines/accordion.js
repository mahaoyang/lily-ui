// src/machines/accordion.ts
function createAccordion(config = {}) {
  const {
    type = "single",
    defaultValue = type === "multiple" ? [] : "",
    collapsible = true,
    disabled = false
  } = config;
  return {
    value: defaultValue,
    disabled,
    type,
    collapsible,
    toggle(id) {
      if (this.disabled)
        return;
      if (this.type === "multiple") {
        const values = this.value;
        if (values.includes(id)) {
          this.value = values.filter((v) => v !== id);
        } else {
          this.value = [...values, id];
        }
      } else {
        if (this.value === id) {
          if (this.collapsible) {
            this.value = "";
          }
        } else {
          this.value = id;
        }
      }
      config.onChange?.(this.value);
    },
    isOpen(id) {
      if (this.type === "multiple") {
        return this.value.includes(id);
      }
      return this.value === id;
    },
    getState(id) {
      return this.isOpen(id) ? "open" : "closed";
    },
    itemProps(id) {
      return {
        "data-state": this.getState(id),
        "data-disabled": this.disabled ? "" : undefined
      };
    },
    triggerProps(id) {
      return {
        id: `accordion-trigger-${id}`,
        "aria-expanded": this.isOpen(id).toString(),
        "aria-controls": `accordion-content-${id}`,
        "data-state": this.getState(id),
        "data-disabled": this.disabled ? "" : undefined
      };
    },
    contentProps(id) {
      return {
        id: `accordion-content-${id}`,
        role: "region",
        "aria-labelledby": `accordion-trigger-${id}`,
        "data-state": this.getState(id)
      };
    }
  };
}
export {
  createAccordion as default
};
