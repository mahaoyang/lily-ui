// src/machines/tabs.ts
function createTabs(config = {}) {
  const { defaultValue = "tab-1" } = config;
  return {
    activeId: defaultValue,
    select(id) {
      this.activeId = id;
      config.onChange?.(id);
    },
    isActive(id) {
      return this.activeId === id;
    },
    triggerProps(id) {
      return {
        role: "tab",
        "aria-controls": `${id}-panel`,
        id: `${id}-trigger`
      };
    },
    contentProps(id) {
      return {
        id: `${id}-panel`,
        role: "tabpanel",
        "aria-labelledby": `${id}-trigger`
      };
    }
  };
}
export {
  createTabs as default
};
