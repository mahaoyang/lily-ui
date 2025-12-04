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
  /** 内容标题 id，用于 aria-labelledby */
  labelId?: string;
  /** 内容描述 id，用于 aria-describedby */
  descriptionId?: string;
  /** 对话框内容节点 id，用于 aria-controls 关联 */
  id?: string;
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
}

let bodyLockCount = 0;
let previousBodyOverflow: string | null = null;
let dialogIdCounter = 0;

export function createDialog(options: DialogOptions = {}) {
  const {
    defaultOpen = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = '3',
    align = 'center',
    labelId,
    descriptionId,
    id,
    onOpenChange,
  } = options;
  const contentId = id ?? `dialog-${++dialogIdCounter}`;

  return {
    // 状态
    open: defaultOpen,
    lastActiveElement: null as HTMLElement | null,

    // 配置
    size,
    align,

    // Alpine 初始化时处理默认打开和锁滚动
    init() {
      if (this.open) {
        this.lockBodyScroll();
      }
    },

    // 方法
    show() {
      if (!this.open) {
        this.open = true;
        this.lastActiveElement = document.activeElement as HTMLElement | null;
        this.lockBodyScroll();
        this.$nextTick?.(() => {
          const content = (this as any)?.$refs?.content as HTMLElement | undefined;
          content?.focus();
        });
        onOpenChange?.(true);
      }
    },

    hide() {
      if (this.open) {
        this.open = false;
        this.unlockBodyScroll();
        this.lastActiveElement?.focus?.({ preventScroll: true });
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
      if (bodyLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      bodyLockCount += 1;
    },

    // 解锁 body 滚动
    unlockBodyScroll() {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow ?? '';
        previousBodyOverflow = null;
      }
    },

    // Overlay 属性
    overlayProps() {
      return {
        '@click.self': closeOnOverlayClick ? 'hide()' : undefined,
        '@keydown.escape.window': closeOnEscape ? 'hide()' : undefined,
        'data-state': this.open ? 'open' : 'closed',
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': labelId,
        'aria-describedby': descriptionId,
        tabindex: '-1',
        'data-state': this.open ? 'open' : 'closed',
        'x-ref': 'content',
        id: contentId,
      };
    },

    // Close button 属性
    closeProps() {
      return {
        type: 'button',
        'aria-label': 'Close dialog',
      };
    },

    // Trigger 属性
    triggerProps() {
      return {
        type: 'button',
        'aria-haspopup': 'dialog',
        'aria-expanded': this.open,
        'aria-controls': contentId,
        '@click': 'toggle()',
      };
    },
  };
}
