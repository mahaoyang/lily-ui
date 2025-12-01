/**
 * Navbar Component for Lily UI
 *
 * Usage: Include this script and add the navbar HTML with x-data="navbar()"
 */

export function navbar() {
  return {
    // Color picker state
    expanded: false,
    animating: false,
    hoverTimer: null,
    leaveTimer: null,
    colors: ['iris', 'blue', 'violet', 'teal', 'jade', 'red'],

    getOffset(color, selectedColor) {
      const selectedIdx = this.colors.indexOf(selectedColor);
      return (this.colors.length - 1 - selectedIdx) * 20;
    },

    expand() {
      this.animating = true;
      setTimeout(() => {
        this.expanded = true;
        this.animating = false;
      }, 250);
    },

    collapse() {
      this.expanded = false;
    },

    onMouseEnter() {
      clearTimeout(this.leaveTimer);
      clearTimeout(this.hoverTimer);
      this.hoverTimer = setTimeout(() => this.expand(), 100);
    },

    onMouseLeave() {
      clearTimeout(this.hoverTimer);
      this.leaveTimer = setTimeout(() => this.collapse(), 100);
    },

    toggleTheme() {
      const toggle = () => {
        this.$data.theme = this.$data.theme === 'light' ? 'dark' : 'light';
      };
      if (document.startViewTransition) {
        document.startViewTransition(toggle);
      } else {
        toggle();
      }
    }
  }
}

// Auto-register with Alpine when available
if (typeof Alpine !== 'undefined') {
  Alpine.data('navbar', navbar);
} else {
  document.addEventListener('alpine:init', () => {
    Alpine.data('navbar', navbar);
  });
}
