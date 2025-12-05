/**
 * Accordion State Machine
 *
 * A state machine for managing accordion/collapsible sections
 * with support for single or multiple expanded items.
 */

export interface AccordionState {
  type: 'single' | 'multiple';
  value: string | string[];
  collapsible: boolean;
}

export interface AccordionActions {
  isOpen(itemValue: string): boolean;
  toggle(itemValue: string): void;
  open(itemValue: string): void;
  close(itemValue: string): void;
}

export function createAccordion(
  options: {
    type?: 'single' | 'multiple';
    defaultValue?: string | string[];
    collapsible?: boolean;
  } = {}
): AccordionState & AccordionActions {
  const { type = 'single', defaultValue, collapsible = true } = options;

  return {
    type,
    value: defaultValue ?? (type === 'single' ? '' : []),
    collapsible,

    isOpen(itemValue: string): boolean {
      if (this.type === 'single') {
        return this.value === itemValue;
      }
      return (this.value as string[]).includes(itemValue);
    },

    toggle(itemValue: string): void {
      if (this.isOpen(itemValue)) {
        this.close(itemValue);
      } else {
        this.open(itemValue);
      }
    },

    open(itemValue: string): void {
      if (this.type === 'single') {
        this.value = itemValue;
      } else {
        if (!(this.value as string[]).includes(itemValue)) {
          this.value = [...(this.value as string[]), itemValue];
        }
      }
    },

    close(itemValue: string): void {
      if (this.type === 'single') {
        if (this.collapsible) {
          this.value = '';
        }
      } else {
        this.value = (this.value as string[]).filter(v => v !== itemValue);
      }
    }
  };
}

// Export for Alpine.js data registration
export function accordion(options?: {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  collapsible?: boolean;
}) {
  return createAccordion(options);
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
  (window as any).accordion = accordion;
}

export default accordion;
