const ALLOW_PINCH_SELECTOR = '[data-allow-pinch-zoom="true"]';

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const canUsePinchZoom = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(ALLOW_PINCH_SELECTOR));
};

export const installPageZoomLock = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (!isStandalonePwa()) return () => {};

  let lastTouchEnd = 0;

  const preventGesture = (event) => {
    if (canUsePinchZoom(event.target)) return;
    event.preventDefault();
  };

  const handleWheel = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (canUsePinchZoom(event.target)) return;
    event.preventDefault();
  };

  const handleTouchMove = (event) => {
    if (event.touches.length < 2) return;
    if (canUsePinchZoom(event.target)) return;
    event.preventDefault();
  };

  const handleTouchEnd = (event) => {
    const now = Date.now();
    const isDoubleTap = now - lastTouchEnd <= 300;
    lastTouchEnd = now;
    if (!isDoubleTap) return;
    if (canUsePinchZoom(event.target)) return;
    event.preventDefault();
  };

  window.addEventListener('wheel', handleWheel, { passive: false });
  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    window.removeEventListener('wheel', handleWheel);
    document.removeEventListener('gesturestart', preventGesture);
    document.removeEventListener('gesturechange', preventGesture);
    document.removeEventListener('gestureend', preventGesture);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };
};
