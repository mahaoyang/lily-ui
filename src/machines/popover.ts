/**
 * Popover Machine
 *
 * 弹出框状态机
 * - 处理 open/close 状态
 * - 支持 ESC 键关闭
 * - 支持点击外部关闭
 * - 支持不同尺寸
 */

export interface PopoverOptions {
  /** 初始打开状态 */
  defaultOpen?: boolean;
  /** 点击外部是否关闭弹出框 */
  closeOnOutsideClick?: boolean;
  /** ESC 键是否关闭弹出框 */
  closeOnEscape?: boolean;
  /** 弹出框尺寸 */
  size?: '1' | '2' | '3' | '4';
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
}

export function createPopover(options: PopoverOptions = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    size = '2',
    onOpenChange,
  } = options;

  return {
    // 状态
    open: defaultOpen,

    // 配置
    size,

    // 方法
    show() {
      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
      }
    },

    hide() {
      if (this.open) {
        this.open = false;
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

    // Trigger 属性
    triggerProps() {
      return {
        type: 'button',
        'aria-haspopup': 'dialog',
        'aria-expanded': this.open,
        '@click': 'toggle()',
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'dialog',
        tabindex: '-1',
        '@keydown.escape.window': closeOnEscape ? 'hide()' : undefined,
        '@click.outside': closeOnOutsideClick ? 'hide()' : undefined,
      };
    },

    // Close button 属性
    closeProps() {
      return {
        type: 'button',
        'aria-label': 'Close popover',
        '@click': 'hide()',
      };
    },
  };
}
