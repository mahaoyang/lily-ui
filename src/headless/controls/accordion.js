/** Theme-independent accordion state, derived from the original Lily UI. */
export function createAccordion({ type = 'single', defaultValue, collapsible = true } = {}) {
  if (!['single', 'multiple'].includes(type)) throw new TypeError('Invalid accordion type');
  if (defaultValue !== undefined && (type === 'multiple' ? !Array.isArray(defaultValue) : typeof defaultValue !== 'string')) {
    throw new TypeError('Accordion value must match its type');
  }
  return {
    type,
    value: type === 'multiple' ? [...new Set(defaultValue ?? [])] : defaultValue ?? '',
    collapsible,
    isOpen(value) { return this.type === 'single' ? this.value === value : this.value.includes(value); },
    open(value) {
      if (this.type === 'single') this.value = value;
      else if (!this.isOpen(value)) this.value = [...this.value, value];
    },
    close(value) {
      if (this.type === 'single') {
        if (this.collapsible && this.value === value) this.value = '';
      } else this.value = this.value.filter(item => item !== value);
    },
    toggle(value) { this.isOpen(value) ? this.close(value) : this.open(value); },
  };
}
