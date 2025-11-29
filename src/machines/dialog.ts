/**
 * Dialog Machine
 *
 * 对话框/模态框状态机
 * - 处理 open/close 状态
 * - 支持 ESC 键关闭
 * - 支持点击 overlay 关闭
 * - 管理 body scroll lock
 * - 支持不同尺寸 (size: 1-4)
 */

export interface DialogOptions {
  /** 初始打开状态 */
  defaultOpen?: boolean;
  /** 点击 overlay 是否关闭对话框 */
  closeOnOverlayClick?: boolean;
  /** ESC 键是否关闭对话框 */
  closeOnEscape?: boolean;
  /** 对话框尺寸 */
  size?: '1' | '2' | '3' | '4';
  /** 对话框垂直对齐方式 */
  align?: 'start' | 'center';
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
}

export function createDialog(options: DialogOptions = {}) {
  const {
    defaultOpen = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = '3',
    align = 'center',
    onOpenChange,
  } = options;

  return {
    // 状态
    open: defaultOpen,

    // 配置
    size,
    align,

    // 方法
    show() {
      if (!this.open) {
        this.open = true;
        this.lockBodyScroll();
        onOpenChange?.(true);
      }
    },

    hide() {
      if (this.open) {
        this.open = false;
        this.unlockBodyScroll();
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

    // 锁定 body 滚动
    lockBodyScroll() {
      document.body.style.overflow = 'hidden';
    },

    // 解锁 body 滚动
    unlockBodyScroll() {
      document.body.style.overflow = '';
    },

    // Overlay 属性
    overlayProps() {
      return {
        role: 'dialog',
        'aria-modal': 'true',
        '@click.self': closeOnOverlayClick ? 'hide()' : undefined,
        '@keydown.escape.window': closeOnEscape ? 'hide()' : undefined,
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'document',
        tabindex: '-1',
      };
    },

    // Close button 属性
    closeProps() {
      return {
        type: 'button',
        'aria-label': 'Close dialog',
      };
    },
  };
}
