// src/machines/accordion.ts
function createAccordion(options = {}) {
  const { type = "single", defaultValue, collapsible = true } = options;
  return {
    type,
    value: defaultValue ?? (type === "single" ? "" : []),
    collapsible,
    isOpen(itemValue) {
      if (this.type === "single") {
        return this.value === itemValue;
      }
      return this.value.includes(itemValue);
    },
    toggle(itemValue) {
      if (this.isOpen(itemValue)) {
        this.close(itemValue);
      } else {
        this.open(itemValue);
      }
    },
    open(itemValue) {
      if (this.type === "single") {
        this.value = itemValue;
      } else {
        if (!this.value.includes(itemValue)) {
          this.value = [...this.value, itemValue];
        }
      }
    },
    close(itemValue) {
      if (this.type === "single") {
        if (this.collapsible) {
          this.value = "";
        }
      } else {
        this.value = this.value.filter((v) => v !== itemValue);
      }
    }
  };
}
function accordion(options) {
  return createAccordion(options);
}
if (typeof window !== "undefined") {
  window.accordion = accordion;
}
var accordion_default = accordion;
export {
  accordion_default as default,
  createAccordion,
  accordion
};
