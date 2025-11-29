type ToastType = "default" | "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastConfig {
  defaultDuration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

export default function createToast(config: ToastConfig = {}) {
  const { defaultDuration = 5000, position = "bottom-right" } = config;
  const timers = new Map<string, number>();

  return {
    toasts: [] as Toast[],
    position,

    add(toast: Omit<Toast, "id"> & { id?: string }) {
      const id = toast.id ?? crypto.randomUUID();
      const newToast: Toast = {
        id,
        type: "default",
        duration: defaultDuration,
        ...toast,
      };
      this.toasts = [...this.toasts, newToast];

      if (newToast.duration && newToast.duration > 0) {
        this.scheduleRemove(id, newToast.duration);
      }

      return id;
    },

    remove(id: string) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
    },

    scheduleRemove(id: string, duration: number) {
      const timer = window.setTimeout(() => this.remove(id), duration);
      timers.set(id, timer);
    },

    // Convenience methods
    success(title: string, description?: string) {
      return this.add({ title, description, type: "success" });
    },

    error(title: string, description?: string) {
      return this.add({ title, description, type: "error" });
    },

    warning(title: string, description?: string) {
      return this.add({ title, description, type: "warning" });
    },

    info(title: string, description?: string) {
      return this.add({ title, description, type: "info" });
    },

    // Props
    viewportProps() {
      return {
        role: "region",
        "aria-label": "Notifications",
      };
    },

    toastProps(id: string) {
      return {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
      };
    },
  };
}
