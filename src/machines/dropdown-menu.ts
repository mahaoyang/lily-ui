/**
 * Dropdown Menu Machine
 *
 * 下拉菜单状态机
 * - 处理 open/close 状态
 * - 支持键盘导航 (ArrowUp/Down, Enter, Escape, Home, End)
 * - 支持点击外部关闭
 * - 支持 ESC 键关闭
 * - 支持不同尺寸和变体
 */

export interface DropdownMenuOptions {
  /** 初始打开状态 */
  defaultOpen?: boolean;
  /** 点击外部是否关闭菜单 */
  closeOnOutsideClick?: boolean;
  /** ESC 键是否关闭菜单 */
  closeOnEscape?: boolean;
  /** 选择项后是否关闭菜单 */
  closeOnSelect?: boolean;
  /** 菜单尺寸 */
  size?: '1' | '2';
  /** 菜单变体 */
  variant?: 'solid' | 'soft';
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 选择项回调 */
  onSelect?: (value: string) => void;
}

export function createDropdownMenu(options: DropdownMenuOptions = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    closeOnSelect = true,
    size = '2',
    variant = 'solid',
    onOpenChange,
    onSelect,
  } = options;

  return {
    // 状态
    open: defaultOpen,
    highlightedIndex: -1,
    items: [] as HTMLElement[],

    // 配置
    size,
    variant,

    // 初始化方法
    init() {
      // 在 Alpine 初始化时调用，收集所有菜单项
      this.$nextTick(() => {
        this.updateItems();
      });
    },

    // 更新菜单项列表
    updateItems() {
      const content = this.$refs.content as HTMLElement;
      if (content) {
        this.items = Array.from(
          content.querySelectorAll('[role="menuitem"]:not([data-disabled])')
        );
      }
    },

    // 方法
    show() {
      if (!this.open) {
        this.open = true;
        this.highlightedIndex = -1;
        this.updateItems();
        // 聚焦到第一个菜单项
        this.$nextTick(() => {
          if (this.items.length > 0) {
            this.highlightedIndex = 0;
            this.items[0]?.focus();
          }
        });
        onOpenChange?.(true);
      }
    },

    hide() {
      if (this.open) {
        this.open = false;
        this.highlightedIndex = -1;
        onOpenChange?.(false);
      }
    },

    toggle() {
      if (this.open) {
        this.hide();
      } else {
        this.show();
      }
    },

    // 键盘导航
    handleKeyDown(event: KeyboardEvent) {
      if (!this.open) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightNext();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.highlightPrev();
          break;
        case 'Home':
          event.preventDefault();
          this.highlightFirst();
          break;
        case 'End':
          event.preventDefault();
          this.highlightLast();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          this.selectHighlighted();
          break;
        case 'Escape':
          if (closeOnEscape) {
            event.preventDefault();
            this.hide();
          }
          break;
      }
    },

    highlightNext() {
      if (this.items.length === 0) return;
      this.highlightedIndex = (this.highlightedIndex + 1) % this.items.length;
      this.items[this.highlightedIndex]?.focus();
    },

    highlightPrev() {
      if (this.items.length === 0) return;
      this.highlightedIndex =
        this.highlightedIndex <= 0
          ? this.items.length - 1
          : this.highlightedIndex - 1;
      this.items[this.highlightedIndex]?.focus();
    },

    highlightFirst() {
      if (this.items.length === 0) return;
      this.highlightedIndex = 0;
      this.items[0]?.focus();
    },

    highlightLast() {
      if (this.items.length === 0) return;
      this.highlightedIndex = this.items.length - 1;
      this.items[this.highlightedIndex]?.focus();
    },

    selectHighlighted() {
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.items.length) {
        const item = this.items[this.highlightedIndex];
        if (item) {
          const value = item.getAttribute('data-value') || '';
          onSelect?.(value);
          item.click();
          if (closeOnSelect) {
            this.hide();
          }
        }
      }
    },

    selectItem(value: string) {
      onSelect?.(value);
      if (closeOnSelect) {
        this.hide();
      }
    },

    // Trigger 属性
    triggerProps() {
      return {
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': this.open,
        '@click': 'toggle()',
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'menu',
        tabindex: '-1',
        '@keydown': 'handleKeyDown($event)',
        '@click.outside': closeOnOutsideClick ? 'hide()' : undefined,
      };
    },

    // Menu Item 属性
    itemProps(value: string, disabled = false) {
      return {
        role: 'menuitem',
        tabindex: disabled ? undefined : '0',
        'data-value': value,
        'data-disabled': disabled || undefined,
        '@click': disabled ? undefined : `selectItem('${value}')`,
        '@mouseenter': disabled ? undefined : `highlightedIndex = items.indexOf($el)`,
      };
    },
  };
}
