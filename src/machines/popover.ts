/**
 * Popover Machine
 *
 * 弹出框状态机 (Portal 模式)
 * - 使用 x-teleport 渲染到 body，避免被父容器遮挡
 * - 自动计算位置，支持 side 和 align 配置
 * - 边缘检测，自动翻转位置
 * - 支持 ESC 键关闭
 * - 支持点击外部关闭
 */

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

export interface PopoverOptions {
  /** 初始打开状态 */
  defaultOpen?: boolean;
  /** 点击外部是否关闭弹出框 */
  closeOnOutsideClick?: boolean;
  /** ESC 键是否关闭弹出框 */
  closeOnEscape?: boolean;
  /** 弹出框尺寸 */
  size?: '1' | '2' | '3' | '4';
  /** 弹出方向 */
  side?: Side;
  /** 对齐方式 */
  align?: Align;
  /** 偏移量 (px) */
  sideOffset?: number;
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
}

export function createPopover(options: PopoverOptions = {}) {
  const {
    defaultOpen = false,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    size = '2',
    side = 'bottom',
    align = 'start',
    sideOffset = 8,
    onOpenChange,
  } = options;

  return {
    // 状态
    open: defaultOpen,
    triggerEl: null as HTMLElement | null,
    contentEl: null as HTMLElement | null,
    position: { top: 0, left: 0 },

    // 配置
    size,
    side,
    align,
    sideOffset,

    // 初始化
    init() {
      // 监听窗口变化重新计算位置
      const updateOnChange = () => {
        if (this.open) this.updatePosition();
      };
      window.addEventListener('resize', updateOnChange);
      window.addEventListener('scroll', updateOnChange, true);
    },

    // 计算位置
    updatePosition() {
      if (!this.triggerEl || !this.contentEl) return;

      const triggerRect = this.triggerEl.getBoundingClientRect();
      const contentRect = this.contentEl.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let top = 0;
      let left = 0;
      let actualSide = this.side;

      // 计算主轴位置 (side)
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewport.height - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewport.width - triggerRect.right;

      // 边缘检测和翻转
      if (actualSide === 'bottom' && spaceBelow < contentRect.height + this.sideOffset && spaceAbove > contentRect.height + this.sideOffset) {
        actualSide = 'top';
      } else if (actualSide === 'top' && spaceAbove < contentRect.height + this.sideOffset && spaceBelow > contentRect.height + this.sideOffset) {
        actualSide = 'bottom';
      } else if (actualSide === 'right' && spaceRight < contentRect.width + this.sideOffset && spaceLeft > contentRect.width + this.sideOffset) {
        actualSide = 'left';
      } else if (actualSide === 'left' && spaceLeft < contentRect.width + this.sideOffset && spaceRight > contentRect.width + this.sideOffset) {
        actualSide = 'right';
      }

      // 根据 side 计算位置
      switch (actualSide) {
        case 'top':
          top = triggerRect.top - contentRect.height - this.sideOffset;
          break;
        case 'bottom':
          top = triggerRect.bottom + this.sideOffset;
          break;
        case 'left':
          left = triggerRect.left - contentRect.width - this.sideOffset;
          break;
        case 'right':
          left = triggerRect.right + this.sideOffset;
          break;
      }

      // 计算交叉轴位置 (align)
      if (actualSide === 'top' || actualSide === 'bottom') {
        switch (this.align) {
          case 'start':
            left = triggerRect.left;
            break;
          case 'center':
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
            break;
          case 'end':
            left = triggerRect.right - contentRect.width;
            break;
        }
      } else {
        switch (this.align) {
          case 'start':
            top = triggerRect.top;
            break;
          case 'center':
            top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
            break;
          case 'end':
            top = triggerRect.bottom - contentRect.height;
            break;
        }
      }

      // 边界约束
      left = Math.max(8, Math.min(left, viewport.width - contentRect.width - 8));
      top = Math.max(8, Math.min(top, viewport.height - contentRect.height - 8));

      this.position = { top, left };
    },

    // 方法
    show() {
      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
        // 等待 DOM 更新后计算位置（x-teleport 需要额外时间）
        this.$nextTick(() => {
          this.updatePosition();
          this.contentEl?.focus?.();
        });
      }
    },

    hide() {
      if (this.open) {
        this.open = false;
        onOpenChange?.(false);
        this.triggerEl?.focus?.({ preventScroll: true });
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
        'aria-controls': id,
        '@click': 'toggle()',
        'x-init': 'triggerEl = $el',
      };
    },

    // Content 属性
    contentProps() {
      return {
        role: 'dialog',
        tabindex: '-1',
        id,
        'x-effect': 'contentEl = $el; if (open) updatePosition()',
        '@keydown.escape.window': closeOnEscape ? 'hide()' : undefined,
        '@click.outside': closeOnOutsideClick ? 'hide()' : undefined,
        ':style': `{ position: 'fixed', top: position.top + 'px', left: position.left + 'px', zIndex: 9999 }`,
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
