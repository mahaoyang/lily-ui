interface TextareaConfig {
  defaultValue?: string;
  disabled?: boolean;
  autoGrow?: boolean;
  onChange?: (value: string) => void;
}

export default function createTextarea(config: TextareaConfig = {}) {
  const { defaultValue = "", disabled = false, autoGrow = true } = config;

  return {
    value: defaultValue,
    disabled,
    autoGrow,

    setValue(next: string, el?: HTMLTextAreaElement) {
      if (this.disabled) return;
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
        "@input": (e: Event) => {
          const el = e.target as HTMLTextAreaElement;
          this.setValue(el.value, el);
        },
        "x-ref": "textarea",
        "x-init"() {
          const el = (this as unknown as { $refs: Record<string, HTMLElement> }).$refs.textarea as HTMLTextAreaElement | undefined;
          if (el && autoGrow) {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }
        },
      };
    },
  };
}
