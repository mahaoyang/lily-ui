interface TabConfig {
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export default function createTabs(config: TabConfig = {}) {
  const { defaultValue = "tab-1" } = config;

  return {
    activeId: defaultValue,

    select(id: string) {
      this.activeId = id;
      config.onChange?.(id);
    },

    triggerProps(id: string) {
      const isSelected = this.activeId === id;
      return {
        role: "tab",
        "aria-selected": isSelected.toString(),
        "aria-controls": `${id}-panel`,
        tabindex: isSelected ? "0" : "-1",
        "data-state": isSelected ? "active" : "inactive",
        "@click": () => this.select(id),
        "@keydown.enter.prevent": () => this.select(id),
        "@keydown.space.prevent": () => this.select(id),
      };
    },

    contentProps(id: string) {
      const isSelected = this.activeId === id;
      return {
        id: `${id}-panel`,
        role: "tabpanel",
        "aria-labelledby": id,
        "x-show": isSelected,
        "data-state": isSelected ? "active" : "inactive",
        class: isSelected ? "block" : "hidden",
      };
    },
  };
}
