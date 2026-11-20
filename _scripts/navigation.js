/* Keep the existing checkbox navigation keyboard operable. */
{
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const toggle = document.querySelector(".nav-toggle");
    const navigation = document.getElementById("primary-navigation");
    if (
      toggle?.checked &&
      toggle.getClientRects().length &&
      (navigation.contains(document.activeElement) || document.activeElement === toggle)
    ) {
      toggle.checked = false;
      toggle.focus();
    }
  });
}
