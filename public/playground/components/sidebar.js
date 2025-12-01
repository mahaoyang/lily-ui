// Shared Sidebar Component
// Exports sidebar HTML and initialization function

export const sidebarHTML = `
<div class="sidebar-section">Overview</div>
<a href="/public/playground/docs.html" class="sidebar-link" data-page="docs">Getting started</a>

<div class="sidebar-section">Layout</div>
<a href="/public/playground/box.html" class="sidebar-link">Box</a>
<a href="/public/playground/flex.html" class="sidebar-link">Flex</a>
<a href="/public/playground/grid.html" class="sidebar-link">Grid</a>
<a href="/public/playground/container.html" class="sidebar-link">Container</a>
<a href="/public/playground/section.html" class="sidebar-link">Section</a>

<div class="sidebar-section">Form Controls</div>
<a href="/public/playground/switch.html" class="sidebar-link">Switch</a>
<a href="/public/playground/checkbox.html" class="sidebar-link">Checkbox</a>
<a href="/public/playground/checkbox-group.html" class="sidebar-link">Checkbox Group</a>
<a href="/public/playground/checkbox-cards.html" class="sidebar-link">Checkbox Cards</a>
<a href="/public/playground/radio.html" class="sidebar-link">Radio</a>
<a href="/public/playground/radio-cards.html" class="sidebar-link">Radio Cards</a>
<a href="/public/playground/input.html" class="sidebar-link">Input</a>
<a href="/public/playground/slider.html" class="sidebar-link">Slider</a>
<a href="/public/playground/tags.html" class="sidebar-link">Tags Input</a>
<a href="/public/playground/select.html" class="sidebar-link">Select</a>

<div class="sidebar-section">Navigation</div>
<a href="/public/playground/tabs.html" class="sidebar-link">Tabs</a>
<a href="/public/playground/accordion.html" class="sidebar-link">Accordion</a>
<a href="/public/playground/scroll-area.html" class="sidebar-link">Scroll Area</a>
<a href="/public/playground/segmented-control.html" class="sidebar-link">Segmented Control</a>
<a href="/public/playground/tab-nav.html" class="sidebar-link">Tab Nav</a>

<div class="sidebar-section">Display</div>
<a href="/public/playground/button.html" class="sidebar-link">Button</a>
<a href="/public/playground/icon-button.html" class="sidebar-link">Icon Button</a>
<a href="/public/playground/badge.html" class="sidebar-link">Badge</a>
<a href="/public/playground/avatar.html" class="sidebar-link">Avatar</a>
<a href="/public/playground/card.html" class="sidebar-link">Card</a>
<a href="/public/playground/spinner.html" class="sidebar-link">Spinner</a>
<a href="/public/playground/skeleton.html" class="sidebar-link">Skeleton</a>
<a href="/public/playground/separator.html" class="sidebar-link">Separator</a>
<a href="/public/playground/aspect-ratio.html" class="sidebar-link">Aspect Ratio</a>
<a href="/public/playground/inset.html" class="sidebar-link">Inset</a>

<div class="sidebar-section">Data & Feedback</div>
<a href="/public/playground/toast.html" class="sidebar-link">Toast</a>
<a href="/public/playground/progress.html" class="sidebar-link">Progress</a>
<a href="/public/playground/tri-switch.html" class="sidebar-link">Tri-state Switch</a>
<a href="/public/playground/table.html" class="sidebar-link">Table</a>
<a href="/public/playground/data-list.html" class="sidebar-link">Data List</a>

<div class="sidebar-section">Typography</div>
<a href="/public/playground/typography.html" class="sidebar-link">Typography</a>
<a href="/public/playground/kbd.html" class="sidebar-link">Kbd</a>
<a href="/public/playground/callout.html" class="sidebar-link">Callout</a>
<a href="/public/playground/code.html" class="sidebar-link">Code</a>
<a href="/public/playground/blockquote.html" class="sidebar-link">Blockquote</a>

<div class="sidebar-section">Overlays</div>
<a href="/public/playground/dialog.html" class="sidebar-link">Dialog</a>
<a href="/public/playground/alert-dialog.html" class="sidebar-link">Alert Dialog</a>
<a href="/public/playground/tooltip.html" class="sidebar-link">Tooltip</a>
<a href="/public/playground/dropdown-menu.html" class="sidebar-link">Dropdown Menu</a>
<a href="/public/playground/popover.html" class="sidebar-link">Popover</a>
<a href="/public/playground/hover-card.html" class="sidebar-link">Hover Card</a>
<a href="/public/playground/context-menu.html" class="sidebar-link">Context Menu</a>
`;

// ScrollArea state machine for sidebar
export function scrollArea() {
  return {
    showScrollbar: false,
    thumbHeight: 0,
    thumbTop: 0,
    isDragging: false,
    dragStartY: 0,
    dragStartScrollTop: 0,

    init() {
      this.$nextTick(() => {
        this.updateThumb();
        // Inject sidebar content
        const content = this.$refs.sidebarContent;
        if (content) {
          content.innerHTML = sidebarHTML;
          this.markActive();
        }
      });
    },

    markActive() {
      const currentPath = window.location.pathname;
      const links = this.$el.querySelectorAll('.sidebar-link');
      links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
        }
      });
    },

    updateThumb() {
      const viewport = this.$refs.viewport;
      if (!viewport) return;

      const { scrollHeight, clientHeight, scrollTop } = viewport;
      if (scrollHeight <= clientHeight) {
        this.thumbHeight = 0;
        return;
      }

      const ratio = clientHeight / scrollHeight;
      this.thumbHeight = Math.max(ratio * clientHeight, 24);
      this.thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - this.thumbHeight);
    },

    onScroll() {
      this.updateThumb();
    },

    onMouseEnter() {
      this.showScrollbar = true;
    },

    onMouseLeave() {
      if (!this.isDragging) {
        this.showScrollbar = false;
      }
    },

    clickTrack(event) {
      const viewport = this.$refs.viewport;
      const track = this.$refs.track;
      if (!viewport || !track) return;

      const rect = track.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const ratio = clickY / rect.height;
      viewport.scrollTop = ratio * (viewport.scrollHeight - viewport.clientHeight);
    },

    startDrag(event) {
      this.isDragging = true;
      this.dragStartY = event.clientY;
      this.dragStartScrollTop = this.$refs.viewport.scrollTop;

      const onMouseMove = (e) => {
        if (!this.isDragging) return;
        const viewport = this.$refs.viewport;
        const track = this.$refs.track;
        const deltaY = e.clientY - this.dragStartY;
        const scrollRatio = deltaY / (track.clientHeight - this.thumbHeight);
        viewport.scrollTop = this.dragStartScrollTop + scrollRatio * (viewport.scrollHeight - viewport.clientHeight);
      };

      const onMouseUp = () => {
        this.isDragging = false;
        if (!this.$el.matches(':hover')) {
          this.showScrollbar = false;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },

    get thumbStyle() {
      return `height: ${this.thumbHeight}px; top: ${this.thumbTop}px;`;
    }
  };
}

// Alpine.js data registration
if (typeof Alpine !== 'undefined') {
  Alpine.data('scrollArea', scrollArea);
}
