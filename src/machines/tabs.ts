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

    isActive(id: string) {
      return this.activeId === id;
    },

    // 返回静态属性，动态属性由 HTML 层绑定
    triggerProps(id: string) {
      return {
        role: "tab",
        "aria-controls": `${id}-panel`,
        id: `${id}-trigger`,
      };
    },

    contentProps(id: string) {
      return {
        id: `${id}-panel`,
        role: "tabpanel",
        "aria-labelledby": `${id}-trigger`,
      };
    },
  };
}
