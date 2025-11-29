// src/machines/input.ts
function createInput(config = {}) {
  const { defaultValue = "" } = config;
  return {
    value: defaultValue,
    setValue(next) {
      this.value = next;
      config.onChange?.(this.value);
    },
    clear() {
      this.setValue("");
    },
    inputProps() {
      return {
        type: "text",
        value: this.value,
        "@input": (e) => {
          const target = e.target;
          this.setValue(target.value);
        },
        "@change": (e) => {
          const target = e.target;
          this.setValue(target.value);
        }
      };
    }
  };
}
export {
  createInput as default
};
