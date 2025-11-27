import { defineComponent, h, type PropType, type SlotsType } from 'vue';
import '@lily-ui/core';

export const LilyButton = defineComponent({
  name: 'LilyButton',
  props: {
    variant: {
      type: String as PropType<'primary' | 'secondary'>,
      default: 'primary',
    },
  },
  slots: Object as SlotsType<{
    default: Record<string, never>;
  }>,
  setup(props, { slots }) {
    return () =>
      h(
        'lily-button',
        { variant: props.variant },
        slots.default?.()
      );
  },
});
