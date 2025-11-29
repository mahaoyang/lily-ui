// src/machines/pagination.ts
function createPagination(config) {
  const { total, pageSize = 10, defaultPage = 1, onChange } = config;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clamp = (p) => Math.min(pageCount, Math.max(1, p));
  return {
    page: clamp(defaultPage),
    pageCount,
    next() {
      this.setPage(this.page + 1);
    },
    prev() {
      this.setPage(this.page - 1);
    },
    setPage(p) {
      const next = clamp(p);
      if (next === this.page)
        return;
      this.page = next;
      onChange?.(this.page);
    },
    itemProps(p) {
      const active = this.page === p;
      return {
        "data-active": active ? "" : undefined,
        "@click": () => this.setPage(p),
        tabindex: active ? "-1" : "0",
        "aria-current": active ? "page" : undefined
      };
    }
  };
}
export {
  createPagination as default
};
