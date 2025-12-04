/**
 * Alert Dialog Machine
 *
 * 警告对话框状态机 - 用于确认操作
 * - 处理 open/close 状态
 * - 支持 ESC 键关闭（可配置）
 * - 不支持点击 overlay 关闭（与 Dialog 的区别）
 * - 管理 body scroll lock
 * - 支持确认/取消回调
 * - 适用于需要用户明确操作的场景
 */

export interface AlertDialogOptions {
  /** 初始打开状态 */
  defaultOpen?: boolean;
  /** ESC 键是否关闭对话框 (Alert Dialog 建议禁用) */
  closeOnEscape?: boolean;
  /** 对话框尺寸 */
  size?: '1' | '2' | '3' | '4';
  /** 对话框垂直对齐方式 */
  align?: 'start' | 'center';
  /** 确认按钮回调 */
  onConfirm?: () => void | Promise<void>;
  /** 取消按钮回调 */
  onCancel?: () => void | Promise<void>;
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 内容标题 id，用于 aria-labelledby */
  labelId?: string;
  /** 内容描述 id，用于 aria-describedby */
  descriptionId?: string;
  /** 对话框内容节点 id，用于 aria-controls 关联 */
  id?: string;
}

let alertDialogIdCounter = 0;
let bodyLockCount = 0;
let previousBodyOverflow: string | null = null;

export function createAlertDialog(options: AlertDialogOptions = {}) {
  const {
    defaultOpen = false,
    closeOnEscape = false, // Alert Dialog 默认不允许 ESC 关闭
    size = '3',
    align = 'center',
    onConfirm,
    onCancel,
    onOpenChange,
    labelId,
    descriptionId,
    id,
  } = options;
  const contentId = id ?? `alert-dialog-${++alertDialogIdCounter}`;

  return {
    // 状态
    open: defaultOpen,
    loading: false, // 用于异步操作时的加载状态
    lastActiveElement: null as HTMLElement | null,

    // 配置
    size,
    align,

    // 方法
    init() {
      if (this.open) {
        this.lockBodyScroll();
      }
    },

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
      if (this.open && !this.loading) {
        this.open = false;
        this.loading = false;
        this.unlockBodyScroll();
        this.lastActiveElement?.focus?.({ preventScroll: true });
        onOpenChange?.(false);
      }
    },

    async confirm() {
      if (this.loading) return;

      try {
        if (onConfirm) {
          this.loading = true;
          await onConfirm();
        }
        this.loading = false;
        this.hide();
      } catch (error) {
        // 如果回调抛出错误，保持对话框打开
        console.error('Alert dialog confirm error:', error);
        this.loading = false;
      }
    },

    async cancel() {
      if (this.loading) return;

      try {
        if (onCancel) {
          this.loading = true;
          await onCancel();
        }
        this.loading = false;
        this.hide();
      } catch (error) {
        console.error('Alert dialog cancel error:', error);
        this.loading = false;
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
        // Alert Dialog 不应该支持点击 overlay 关闭
        '@keydown.escape.window': closeOnEscape ? 'hide()' : undefined,
        'data-state': this.open ? 'open' : 'closed',
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': labelId,
        'aria-describedby': descriptionId,
        tabindex: '-1',
        'data-state': this.open ? 'open' : 'closed',
        'x-ref': 'content',
        id: contentId,
      };
    },

    // 确认按钮属性
    confirmProps() {
      return {
        type: 'button',
        ':disabled': 'loading',
        '@click': 'confirm()',
      };
    },

    // 取消按钮属性
    cancelProps() {
      return {
        type: 'button',
        ':disabled': 'loading',
        '@click': 'cancel()',
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
