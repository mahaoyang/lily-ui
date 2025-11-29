interface DropzoneConfig {
  onFiles?: (files: File[]) => void;
  disabled?: boolean;
}

export default function createDropzone(config: DropzoneConfig = {}) {
  return {
    isDragging: false,
    disabled: config.disabled ?? false,
    files: [] as File[],

    handleFiles(fileList: FileList | null) {
      if (!fileList || this.disabled) return;
      const collected = Array.from(fileList);
      this.files = [...this.files, ...collected];
      config.onFiles?.(collected);
    },

    zoneProps() {
      return {
        "data-dragging": this.isDragging ? "" : undefined,
        "data-disabled": this.disabled ? "" : undefined,
        "@dragover.prevent": (e: DragEvent) => {
          if (this.disabled) return;
          e.dataTransfer!.dropEffect = "copy";
          this.isDragging = true;
        },
        "@dragleave.prevent": () => {
          this.isDragging = false;
        },
        "@drop.prevent": (e: DragEvent) => {
          this.isDragging = false;
          this.handleFiles(e.dataTransfer?.files ?? null);
        },
      };
    },

    inputProps() {
      return {
        type: "file",
        multiple: true,
        disabled: this.disabled || undefined,
        "@change": (e: Event) => {
          this.handleFiles((e.target as HTMLInputElement).files);
        },
      };
    },
  };
}
