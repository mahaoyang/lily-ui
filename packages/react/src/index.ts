import * as React from 'react';
import { createComponent } from '@lit/react';
import { LilyButton as LilyButtonElement } from '@lily-ui/core';

export const LilyButton = createComponent({
  tagName: 'lily-button',
  elementClass: LilyButtonElement,
  react: React,
  events: {
    onClick: 'click',
  },
});
