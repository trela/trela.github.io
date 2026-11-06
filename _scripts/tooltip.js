/* 
  shows a popup of text on hover/focus of any element with the data-tooltip
  attribute.
*/

{
  const dismissing = new WeakSet();

  const onLoad = () => {
    // make sure Tippy library available
    if (typeof tippy === "undefined") return;

    // get elements with non-empty tooltips
    const elements = [...document.querySelectorAll("[data-tooltip]")].filter(
      (element) => element.dataset.tooltip.trim() && !element._tippy
    );

    // add tooltip to elements
    tippy(elements, {
      content: (element) => element.dataset.tooltip.trim(),
      delay: [200, 0],
      offset: [0, 20],
      allowHTML: true,
      interactive: true,
      appendTo: () => document.body,
      aria: {
        content: "describedby",
        expanded: null,
      },
      onShow: ({ reference, popper }) => {
        const dark = reference.closest("[data-dark]")?.dataset.dark;
        if (dark === "false") popper.dataset.dark = true;
        if (dark === "true") popper.dataset.dark = false;
      },
      // Either hover or keyboard focus keeps the content available. Tippy's
      // mouseleave/blur handlers otherwise hide it when only one trigger ends.
      onHide: (instance) => {
        if (dismissing.has(instance)) return;
        const { reference, popper } = instance;
        if (reference.matches(":hover, :focus-within") || popper.matches(":hover"))
          return false;
      },
    });
  };

  // after page loads
  window.addEventListener("load", onLoad);
  // after tags load
  window.addEventListener("tagsfetched", onLoad);

  // Tooltips must be dismissible without moving pointer or keyboard focus.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll("[data-tooltip]").forEach((element) => {
      const instance = element._tippy;
      if (!instance) return;
      // Cancel a pending show as well as dismissing an already visible tooltip.
      instance.clearDelayTimeouts();
      dismissing.add(instance);
      instance.hide();
      dismissing.delete(instance);
    });
  });
}
