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
}

export function createAlertDialog(options: AlertDialogOptions = {}) {
  const {
    defaultOpen = false,
    closeOnEscape = false, // Alert Dialog 默认不允许 ESC 关闭
    size = '3',
    align = 'center',
    onConfirm,
    onCancel,
    onOpenChange,
  } = options;

  return {
    // 状态
    open: defaultOpen,
    loading: false, // 用于异步操作时的加载状态

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
      if (this.open && !this.loading) {
        this.open = false;
        this.loading = false;
        this.unlockBodyScroll();
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
      document.body.style.overflow = 'hidden';
    },

    // 解锁 body 滚动
    unlockBodyScroll() {
      document.body.style.overflow = '';
    },

    // Overlay 属性
    overlayProps() {
      return {
        role: 'alertdialog',
        'aria-modal': 'true',
        // Alert Dialog 不应该支持点击 overlay 关闭
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

    // 确认按钮属性
    confirmProps() {
      return {
        type: 'button',
        ':disabled': 'loading',
      };
    },

    // 取消按钮属性
    cancelProps() {
      return {
        type: 'button',
        ':disabled': 'loading',
      };
    },
  };
}
