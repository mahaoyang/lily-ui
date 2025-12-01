/**
 * Simple Component Loader for Lily UI Playground
 *
 * Usage:
 * <div data-component="navbar"></div>
 * <script type="module" src="/public/playground/components/loader.js"></script>
 */

// Load component HTML into placeholder elements
async function loadComponents() {
  const components = document.querySelectorAll('[data-component]');

  for (const el of components) {
    const name = el.dataset.component;
    const src = `/public/playground/components/${name}.html`;

    try {
      const response = await fetch(src);
      if (response.ok) {
        const html = await response.text();
        el.outerHTML = html;
      } else {
        console.warn(`Component not found: ${name}`);
      }
    } catch (err) {
      console.error(`Failed to load component: ${name}`, err);
    }
  }
}

// Import component scripts
import { navbar } from './navbar.js';

// Register Alpine components
document.addEventListener('alpine:init', () => {
  Alpine.data('navbar', navbar);
});

// Load components before Alpine starts
loadComponents().then(() => {
  // Components loaded, Alpine will handle the rest
  console.log('Components loaded');
});
