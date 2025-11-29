// src/machines/textarea.ts
function createTextarea(config = {}) {
  const { defaultValue = "", disabled = false, autoGrow = true } = config;
  return {
    value: defaultValue,
    disabled,
    autoGrow,
    setValue(next, el) {
      if (this.disabled)
        return;
      this.value = next;
      if (this.autoGrow && el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
      config.onChange?.(this.value);
    },
    textareaProps() {
      return {
        value: this.value,
        disabled: this.disabled,
        rows: 3,
        "@input": (e) => {
          const el = e.target;
          this.setValue(el.value, el);
        },
        "x-ref": "textarea",
        "x-init"() {
          const el = this.$refs.textarea;
          if (el && autoGrow) {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }
        }
      };
    }
  };
}
export {
  createTextarea as default
};
