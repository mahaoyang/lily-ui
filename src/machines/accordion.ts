interface AccordionConfig {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  collapsible?: boolean;
  disabled?: boolean;
  onChange?: (value: string | string[]) => void;
}

export function accordionMachine(config: AccordionConfig = {}) {
  const {
    type = "single",
    defaultValue = type === "multiple" ? [] : "",
    collapsible = true,
    disabled = false,
  } = config;

  return {
    // For single type: string, for multiple type: string[]
    value: defaultValue as string | string[],
    disabled,
    type,
    collapsible,

    toggle(id: string) {
      if (this.disabled) return;

      if (this.type === "multiple") {
        const values = this.value as string[];
        if (values.includes(id)) {
          this.value = values.filter((v) => v !== id);
        } else {
          this.value = [...values, id];
        }
      } else {
        // Single mode
        if (this.value === id) {
          // Only allow closing if collapsible
          if (this.collapsible) {
            this.value = "";
          }
        } else {
          this.value = id;
        }
      }

      config.onChange?.(this.value);
    },

    isOpen(id: string): boolean {
      if (this.type === "multiple") {
        return (this.value as string[]).includes(id);
      }
      return this.value === id;
    },

    getState(id: string): "open" | "closed" {
      return this.isOpen(id) ? "open" : "closed";
    },

    // Props for the item element
    itemProps(id: string) {
      return {
        "data-state": this.getState(id),
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },

    // Props for the trigger button
    triggerProps(id: string) {
      return {
        id: `accordion-trigger-${id}`,
        "aria-expanded": this.isOpen(id).toString(),
        "aria-controls": `accordion-content-${id}`,
        "data-state": this.getState(id),
        ...(this.disabled ? { "data-disabled": "" } : {}),
      };
    },

    // Props for the content panel
    contentProps(id: string) {
      return {
        id: `accordion-content-${id}`,
        role: "region",
        "aria-labelledby": `accordion-trigger-${id}`,
        "data-state": this.getState(id),
      };
    },
  };
}
