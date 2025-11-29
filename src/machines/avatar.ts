/**
 * Avatar State Machine
 *
 * Handles image loading states for avatar components with fallback support.
 */

export type AvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarContext {
  status: AvatarStatus;
}

export interface AvatarElements {
  root: HTMLElement;
  img?: HTMLImageElement;
  fallback?: HTMLElement;
}

export function createAvatar(rootElement: HTMLElement) {
  const context: AvatarContext = {
    status: 'idle'
  };

  const elements: AvatarElements = {
    root: rootElement
  };

  // Find the image element
  const img = rootElement.querySelector('img');
  if (img) {
    elements.img = img;
  }

  // Find the fallback element
  const fallback = rootElement.querySelector('[data-avatar-fallback]');
  if (fallback) {
    elements.fallback = fallback as HTMLElement;
  }

  function updateUI() {
    const { status } = context;

    // Update root data attribute
    elements.root.setAttribute('data-status', status);

    // Show/hide image based on status
    if (elements.img) {
      if (status === 'loaded') {
        elements.img.style.display = '';
      } else {
        elements.img.style.display = 'none';
      }
    }

    // Show/hide fallback based on status
    if (elements.fallback) {
      if (status === 'error' || status === 'idle' || status === 'loading') {
        elements.fallback.style.display = '';
      } else {
        elements.fallback.style.display = 'none';
      }
    }
  }

  function handleImageLoad() {
    context.status = 'loaded';
    updateUI();
  }

  function handleImageError() {
    context.status = 'error';
    updateUI();
  }

  function handleImageLoadStart() {
    context.status = 'loading';
    updateUI();
  }

  // Set up image event listeners
  if (elements.img) {
    // If image is already loaded
    if (elements.img.complete) {
      if (elements.img.naturalWidth > 0) {
        context.status = 'loaded';
      } else {
        context.status = 'error';
      }
    } else {
      context.status = 'loading';
      elements.img.addEventListener('loadstart', handleImageLoadStart);
      elements.img.addEventListener('load', handleImageLoad);
      elements.img.addEventListener('error', handleImageError);
    }
  }

  // Initial UI update
  updateUI();

  // Cleanup function
  function destroy() {
    if (elements.img) {
      elements.img.removeEventListener('loadstart', handleImageLoadStart);
      elements.img.removeEventListener('load', handleImageLoad);
      elements.img.removeEventListener('error', handleImageError);
    }
  }

  return {
    getStatus: () => context.status,
    destroy
  };
}
