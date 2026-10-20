// Whether the user asked their system for less motion
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

// scrollIntoView options that center an element: a smooth scroll, or a jump with reduced motion
export const centerScroll = () => ({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
