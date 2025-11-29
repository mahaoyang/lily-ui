// src/machines/toast.ts
function createToast(config = {}) {
  const queue = new Map;
  return {
    toasts: config.defaultToasts ?? [],
    push(toast) {
      const merged = { duration: 3000, ...toast };
      this.toasts = [...this.toasts, merged];
      this.scheduleAutoClose(merged);
    },
    remove(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      const timer = queue.get(id);
      if (timer) {
        clearTimeout(timer);
        queue.delete(id);
      }
    },
    scheduleAutoClose(toast) {
      const timer = window.setTimeout(() => this.remove(toast.id), toast.duration);
      queue.set(toast.id, timer);
    },
    listProps() {
      return {
        role: "status",
        "aria-live": "polite"
      };
    },
    itemProps(id) {
      return {
        "data-id": id
      };
    }
  };
}
export {
  createToast as default
};
