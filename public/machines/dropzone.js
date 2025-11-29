// src/machines/dropzone.ts
function createDropzone(config = {}) {
  return {
    isDragging: false,
    disabled: config.disabled ?? false,
    files: [],
    handleFiles(fileList) {
      if (!fileList || this.disabled)
        return;
      const collected = Array.from(fileList);
      this.files = [...this.files, ...collected];
      config.onFiles?.(collected);
    },
    zoneProps() {
      return {
        "data-dragging": this.isDragging ? "" : undefined,
        "data-disabled": this.disabled ? "" : undefined,
        "@dragover.prevent": (e) => {
          if (this.disabled)
            return;
          e.dataTransfer.dropEffect = "copy";
          this.isDragging = true;
        },
        "@dragleave.prevent": () => {
          this.isDragging = false;
        },
        "@drop.prevent": (e) => {
          this.isDragging = false;
          this.handleFiles(e.dataTransfer?.files ?? null);
        }
      };
    },
    inputProps() {
      return {
        type: "file",
        multiple: true,
        disabled: this.disabled,
        "@change": (e) => {
          this.handleFiles(e.target.files);
        }
      };
    }
  };
}
export {
  createDropzone as default
};
