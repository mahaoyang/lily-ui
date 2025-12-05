/**
 * Tabs State Machine
 *
 * A state machine for managing tabbed interface state
 * with keyboard navigation support.
 */

export interface TabsState {
  value: string;
  orientation: 'horizontal' | 'vertical';
}

export interface TabsActions {
  isActive(tabValue: string): boolean;
  select(tabValue: string): void;
  selectNext(tabValues: string[]): void;
  selectPrevious(tabValues: string[]): void;
  selectFirst(tabValues: string[]): void;
  selectLast(tabValues: string[]): void;
}

export function createTabs(
  options: {
    defaultValue?: string;
    orientation?: 'horizontal' | 'vertical';
  } = {}
): TabsState & TabsActions {
  const { defaultValue = '', orientation = 'horizontal' } = options;

  return {
    value: defaultValue,
    orientation,

    isActive(tabValue: string): boolean {
      return this.value === tabValue;
    },

    select(tabValue: string): void {
      this.value = tabValue;
    },

    selectNext(tabValues: string[]): void {
      const currentIndex = tabValues.indexOf(this.value);
      const nextIndex = (currentIndex + 1) % tabValues.length;
      this.value = tabValues[nextIndex];
    },

    selectPrevious(tabValues: string[]): void {
      const currentIndex = tabValues.indexOf(this.value);
      const prevIndex = currentIndex <= 0 ? tabValues.length - 1 : currentIndex - 1;
      this.value = tabValues[prevIndex];
    },

    selectFirst(tabValues: string[]): void {
      if (tabValues.length > 0) {
        this.value = tabValues[0];
      }
    },

    selectLast(tabValues: string[]): void {
      if (tabValues.length > 0) {
        this.value = tabValues[tabValues.length - 1];
      }
    }
  };
}

// Export for Alpine.js data registration
export function tabs(options?: {
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return createTabs(options);
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
  (window as any).tabs = tabs;
}

export default tabs;
