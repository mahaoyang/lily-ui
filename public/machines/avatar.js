// src/machines/avatar.ts
function createAvatar(rootElement) {
  const context = {
    status: "idle"
  };
  const elements = {
    root: rootElement
  };
  const img = rootElement.querySelector("img");
  if (img) {
    elements.img = img;
  }
  const fallback = rootElement.querySelector("[data-avatar-fallback]");
  if (fallback) {
    elements.fallback = fallback;
  }
  function updateUI() {
    const { status } = context;
    elements.root.setAttribute("data-status", status);
    if (elements.img) {
      if (status === "loaded") {
        elements.img.style.display = "";
      } else {
        elements.img.style.display = "none";
      }
    }
    if (elements.fallback) {
      if (status === "error" || status === "idle" || status === "loading") {
        elements.fallback.style.display = "";
      } else {
        elements.fallback.style.display = "none";
      }
    }
  }
  function handleImageLoad() {
    context.status = "loaded";
    updateUI();
  }
  function handleImageError() {
    context.status = "error";
    updateUI();
  }
  function handleImageLoadStart() {
    context.status = "loading";
    updateUI();
  }
  if (elements.img) {
    if (elements.img.complete) {
      if (elements.img.naturalWidth > 0) {
        context.status = "loaded";
      } else {
        context.status = "error";
      }
    } else {
      context.status = "loading";
      elements.img.addEventListener("loadstart", handleImageLoadStart);
      elements.img.addEventListener("load", handleImageLoad);
      elements.img.addEventListener("error", handleImageError);
    }
  }
  updateUI();
  function destroy() {
    if (elements.img) {
      elements.img.removeEventListener("loadstart", handleImageLoadStart);
      elements.img.removeEventListener("load", handleImageLoad);
      elements.img.removeEventListener("error", handleImageError);
    }
  }
  return {
    getStatus: () => context.status,
    destroy
  };
}
export {
  createAvatar
};
