interface InputConfig {
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export default function createInput(config: InputConfig = {}) {
  const { defaultValue = "", disabled = false } = config;

  return {
    value: defaultValue,
    disabled,

    setValue(next: string) {
      if (this.disabled) return;
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
        "@input": (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.setValue(target.value);
        },
      };
    },
  };
}
