import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lily-button')
export class LilyButton extends LitElement {
  // Light DOM - no Shadow DOM
  createRenderRoot() {
    return this;
  }

  @property() variant: 'primary' | 'secondary' = 'primary';

  render() {
    return html`
      <button class="lily-btn lily-btn--${this.variant}">
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lily-button': LilyButton;
  }
}
