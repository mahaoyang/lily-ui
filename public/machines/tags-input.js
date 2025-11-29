// src/machines/tags-input.ts
function createTagsInput(config = {}) {
  const { defaultTags = [], maxTags } = config;
  return {
    tags: defaultTags,
    inputValue: "",
    addTag(value) {
      const trimmed = value.trim();
      if (!trimmed)
        return;
      if (maxTags && this.tags.length >= maxTags)
        return;
      if (this.tags.includes(trimmed))
        return;
      this.tags = [...this.tags, trimmed];
      this.inputValue = "";
      config.onChange?.(this.tags);
    },
    removeTag(tag) {
      this.tags = this.tags.filter((t) => t !== tag);
      config.onChange?.(this.tags);
    },
    inputProps() {
      return {
        type: "text",
        value: this.inputValue,
        "@input": (e) => {
          this.inputValue = e.target.value;
        },
        "@keydown.enter.prevent": () => this.addTag(this.inputValue)
      };
    }
  };
}
export {
  createTagsInput as default
};
