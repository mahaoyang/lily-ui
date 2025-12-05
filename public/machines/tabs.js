// src/machines/tabs.ts
function createTabs(options = {}) {
  const { defaultValue = "", orientation = "horizontal" } = options;
  return {
    value: defaultValue,
    orientation,
    isActive(tabValue) {
      return this.value === tabValue;
    },
    select(tabValue) {
      this.value = tabValue;
    },
    selectNext(tabValues) {
      const currentIndex = tabValues.indexOf(this.value);
      const nextIndex = (currentIndex + 1) % tabValues.length;
      this.value = tabValues[nextIndex];
    },
    selectPrevious(tabValues) {
      const currentIndex = tabValues.indexOf(this.value);
      const prevIndex = currentIndex <= 0 ? tabValues.length - 1 : currentIndex - 1;
      this.value = tabValues[prevIndex];
    },
    selectFirst(tabValues) {
      if (tabValues.length > 0) {
        this.value = tabValues[0];
      }
    },
    selectLast(tabValues) {
      if (tabValues.length > 0) {
        this.value = tabValues[tabValues.length - 1];
      }
    }
  };
}
function tabs(options) {
  return createTabs(options);
}
if (typeof window !== "undefined") {
  window.tabs = tabs;
}
var tabs_default = tabs;
export {
  tabs,
  tabs_default as default,
  createTabs
};
