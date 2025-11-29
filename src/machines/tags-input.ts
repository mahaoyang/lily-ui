interface TagsInputConfig {
  defaultTags?: string[];
  maxTags?: number;
  onChange?: (tags: string[]) => void;
}

export default function createTagsInput(config: TagsInputConfig = {}) {
  const { defaultTags = [], maxTags } = config;

  return {
    tags: defaultTags,
    inputValue: "",

    addTag(value: string) {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (maxTags && this.tags.length >= maxTags) return;
      if (this.tags.includes(trimmed)) return;
      this.tags = [...this.tags, trimmed];
      this.inputValue = "";
      config.onChange?.(this.tags);
    },

    removeTag(tag: string) {
      this.tags = this.tags.filter((t) => t !== tag);
      config.onChange?.(this.tags);
    },

    inputProps() {
      return {
        type: "text",
        value: this.inputValue,
        "@input": (e: Event) => {
          this.inputValue = (e.target as HTMLInputElement).value;
        },
        "@keydown.enter.prevent": () => this.addTag(this.inputValue),
      };
    },
  };
}
