// Menus, popovers and dialogs: page parts that only exist while open. Shared
// by the element picker (which button opens this menu?) and the tour (keep
// this menu open while a step points into it).

// Containers that only exist in the page while they are open.
const POPUP = '[role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"], .v-popper__popper, .app-menu__popover, .header-menu__content, .modal-mask'

/**
 * @param {Element} el An element
 * @return {Element|null} The menu, popover or dialog it lives in (or is)
 */
export function popupOf(el) {
  return el.closest(POPUP)
}

/**
 * The button that has this popup open, going by ARIA: menu buttons such as
 * Nextcloud's apps "waffle" set aria-expanded="true" while their menu shows.
 *
 * @param {Element} popup An open menu or popover
 * @return {Element|null}
 */
export function openTriggerFor(popup) {
  const expanded = [...popup.ownerDocument.querySelectorAll('[aria-expanded="true"]')]
    .filter(el => !popup.contains(el))
  return expanded.find(el => el.hasAttribute('aria-haspopup')) || expanded[0] || null
}
