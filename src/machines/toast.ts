interface Toast {
  id: string;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastConfig {
  defaultToasts?: Toast[];
}

export default function createToast(config: ToastConfig = {}) {
  const queue = new Map<string, number>();

  return {
    toasts: config.defaultToasts ?? [],

    push(toast: Toast) {
      const merged: Toast = { duration: 3000, ...toast };
      this.toasts = [...this.toasts, merged];
      this.scheduleAutoClose(merged);
    },

    remove(id: string) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      const timer = queue.get(id);
      if (timer) {
        clearTimeout(timer);
        queue.delete(id);
      }
    },

    scheduleAutoClose(toast: Toast) {
      const timer = window.setTimeout(() => this.remove(toast.id), toast.duration);
      queue.set(toast.id, timer);
    },

    listProps() {
      return {
        role: "status",
        "aria-live": "polite",
      };
    },

    itemProps(id: string) {
      return {
        "data-id": id,
      };
    },
  };
}
