// src/machines/toast.ts
function createToast(config = {}) {
  const { defaultDuration = 5000, position = "bottom-right" } = config;
  const timers = new Map;
  return {
    toasts: [],
    position,
    add(toast) {
      const id = toast.id ?? crypto.randomUUID();
      const newToast = {
        id,
        type: "default",
        duration: defaultDuration,
        ...toast
      };
      this.toasts = [...this.toasts, newToast];
      if (newToast.duration && newToast.duration > 0) {
        this.scheduleRemove(id, newToast.duration);
      }
      return id;
    },
    remove(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
    },
    scheduleRemove(id, duration) {
      const timer = window.setTimeout(() => this.remove(id), duration);
      timers.set(id, timer);
    },
    success(title, description) {
      return this.add({ title, description, type: "success" });
    },
    error(title, description) {
      return this.add({ title, description, type: "error" });
    },
    warning(title, description) {
      return this.add({ title, description, type: "warning" });
    },
    info(title, description) {
      return this.add({ title, description, type: "info" });
    },
    viewportProps() {
      return {
        role: "region",
        "aria-label": "Notifications"
      };
    },
    toastProps(id) {
      return {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
      };
    }
  };
}
export {
  createToast as default
};
