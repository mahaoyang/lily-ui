// Sidebar Loader Module
// Loads the shared sidebar component and marks the current page as active

export async function loadSidebar(containerId = 'sidebar-content') {
  try {
    const response = await fetch('/public/playground/components/docs-sidebar.html');
    const html = await response.text();

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;

      // Mark current page as active
      const currentPath = window.location.pathname;
      const links = container.querySelectorAll('.sidebar-link');
      links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
        }
      });
    }
  } catch (error) {
    console.error('Failed to load sidebar:', error);
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadSidebar());
} else {
  loadSidebar();
}
