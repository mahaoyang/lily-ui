interface InputConfig {
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export default function createInput(config: InputConfig = {}) {
  const { defaultValue = "" } = config;

  return {
    value: defaultValue,

    setValue(next: string) {
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
        "@input": (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.setValue(target.value);
        },
        "@change": (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.setValue(target.value);
        },
      };
    },
  };
}
