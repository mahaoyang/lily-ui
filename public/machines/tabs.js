// src/machines/tabs.ts
function createTabs(config = {}) {
  const { defaultValue = "tab-1" } = config;
  return {
    activeId: defaultValue,
    select(id) {
      this.activeId = id;
      config.onChange?.(id);
    },
    triggerProps(id) {
      const isSelected = this.activeId === id;
      return {
        role: "tab",
        "aria-selected": isSelected.toString(),
        "aria-controls": `${id}-panel`,
        tabindex: isSelected ? "0" : "-1",
        "data-state": isSelected ? "active" : "inactive",
        "@click": () => this.select(id),
        "@keydown.enter.prevent": () => this.select(id),
        "@keydown.space.prevent": () => this.select(id)
      };
    },
    contentProps(id) {
      const isSelected = this.activeId === id;
      return {
        id: `${id}-panel`,
        role: "tabpanel",
        "aria-labelledby": id,
        "x-show": isSelected,
        "data-state": isSelected ? "active" : "inactive",
        class: isSelected ? "block" : "hidden"
      };
    }
  };
}
export {
  createTabs as default
};
