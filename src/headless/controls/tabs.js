/** Selection rules only; keyboard events and focus belong to the theme. */
export function createTabs({ defaultValue = '', orientation = 'horizontal' } = {}) {
  return {
    value: defaultValue,
    orientation,
    isActive(value) { return this.value === value; },
    select(value) { this.value = value; },
    selectNext(values) {
      if (values.length) this.value = values[(values.indexOf(this.value) + 1) % values.length];
    },
    selectPrevious(values) {
      if (!values.length) return;
      const index = values.indexOf(this.value);
      this.value = values[index <= 0 ? values.length - 1 : index - 1];
    },
    selectFirst(values) { if (values.length) this.value = values[0]; },
    selectLast(values) { if (values.length) this.value = values[values.length - 1]; },
  };
}
