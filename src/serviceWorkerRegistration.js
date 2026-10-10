/**
 * Registers the offline helper (src/service-worker.js) in production builds.
 *
 * Updates: a new version found while the app starts is applied straight away,
 * when nothing has been typed yet. One that arrives later, during a shift, is
 * only announced (onUpdate) so a sale in progress is never interrupted by a reload.
 */

const UPDATE_CHECK_MS = 60 * 60 * 1000; // tills stay open all day, so look for updates hourly
const STARTUP_WINDOW_MS = 10 * 1000;

export function register({ onUpdate } = {}) {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    const loadedAt = Date.now();
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    // The first install takes control without a reload; later versions reload once.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    let registration;
    try {
      registration = await navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/service-worker.js`);
    } catch {
      return; // the app works normally without it
    }

    const offer = (worker) => {
      const apply = () => worker.postMessage({ type: 'SKIP_WAITING' });
      if (Date.now() - loadedAt < STARTUP_WINDOW_MS) apply();
      else if (onUpdate) onUpdate(apply);
    };

    if (registration.waiting && hadController) offer(registration.waiting);

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });

    setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_MS);
  });
}
