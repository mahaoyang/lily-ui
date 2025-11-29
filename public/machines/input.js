// src/machines/input.ts
function createInput(config = {}) {
  const { defaultValue = "", disabled = false } = config;
  return {
    value: defaultValue,
    disabled,
    setValue(next) {
      if (this.disabled)
        return;
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
        disabled: this.disabled,
        "@input": (e) => {
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
