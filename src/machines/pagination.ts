interface PaginationConfig {
  total: number;
  pageSize?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
}

export default function createPagination(config: PaginationConfig) {
  const { total, pageSize = 10, defaultPage = 1, onChange } = config;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const clamp = (p: number) => Math.min(pageCount, Math.max(1, p));

  return {
    page: clamp(defaultPage),
    pageCount,

    next() {
      this.setPage(this.page + 1);
    },
    prev() {
      this.setPage(this.page - 1);
    },
    setPage(p: number) {
      const next = clamp(p);
      if (next === this.page) return;
      this.page = next;
      onChange?.(this.page);
    },

    itemProps(p: number) {
      const active = this.page === p;
      return {
        "data-active": active ? "" : undefined,
        "@click": () => this.setPage(p),
        tabindex: active ? "-1" : "0",
        "aria-current": active ? "page" : undefined,
      };
    },
  };
}
