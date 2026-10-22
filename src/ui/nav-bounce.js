export function triggerTouchNavIconBounce(tab, enabled = false) {
  const isTouchNavigation = enabled && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const icon = isTouchNavigation && document.querySelector(`[data-nav-bounce-tab="${tab}"] .nav-bounce-icon`);
  if (!icon || isTouchNavigation) return;
  icon.classList.add('nav-icon-bounce');
  icon.addEventListener('animationend', () => icon.classList.remove('nav-icon-bounce'), { once: true });
}
