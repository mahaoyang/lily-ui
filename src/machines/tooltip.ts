/**
 * Tooltip Machine
 *
 * 提示框状态机
 * - 处理 hover 显示/隐藏
 * - 支持延迟显示
 * - 支持不同方向 (side: top, right, bottom, left)
 * - 自动定位防止溢出
 */

export interface TooltipOptions {
  /** 提示框方向 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 显示延迟 (ms) */
  delayDuration?: number;
  /** 隐藏延迟 (ms) */
  hideDelay?: number;
  /** 距离触发元素的偏移量 (px) */
  sideOffset?: number;
  /** 打开/关闭变化回调 */
  onOpenChange?: (open: boolean) => void;
}

export function createTooltip(options: TooltipOptions = {}) {
  const {
    side = 'top',
    delayDuration = 700,
    hideDelay = 0,
    sideOffset = 4,
    onOpenChange,
  } = options;

  let showTimer: number | null = null;
  let hideTimer: number | null = null;

  return {
    // 状态
    open: false,

    // 配置
    side,
    sideOffset,

    // 方法
    show() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      if (!this.open) {
        this.open = true;
        onOpenChange?.(true);
      }
    },

    hide() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }

      if (this.open) {
        this.open = false;
        onOpenChange?.(false);
      }
    },

    // 带延迟显示
    scheduleShow() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      if (showTimer) return;

      showTimer = window.setTimeout(() => {
        this.show();
        showTimer = null;
      }, delayDuration);
    },

    // 带延迟隐藏
    scheduleHide() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }

      if (!this.open) return;

      if (hideDelay > 0) {
        hideTimer = window.setTimeout(() => {
          this.hide();
          hideTimer = null;
        }, hideDelay);
      } else {
        this.hide();
      }
    },

    // 立即隐藏
    hideImmediately() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      this.hide();
    },

    // Trigger 属性
    triggerProps() {
      return {
        'aria-describedby': this.open ? 'tooltip-content' : undefined,
      };
    },

    // Content 属性
    contentProps() {
      return {
        id: 'tooltip-content',
        role: 'tooltip',
      };
    },

    // 清理计时器
    cleanup() {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    },
  };
}
