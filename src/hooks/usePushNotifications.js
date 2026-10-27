import { useState, useEffect, useCallback, useRef } from 'react';

function pushHeaders() {
  const token = localStorage.getItem('resident_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// Helper to convert VAPID public key string into Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = (apiUrl, user = null) => {
  const resolvedApiUrl = apiUrl || (typeof window !== 'undefined' ? (window.__API_URL__ || import.meta.env?.VITE_API_URL) : '') || 'http://localhost:8080/api';
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const subscribeRef = useRef(null);

  // PWA Install states
  const checkStandalone = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true ||
      (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'))
    );
  };

  const checkStoredInstalled = () => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('waterwatch_pwa_installed') === 'true';
    } catch {
      return false;
    }
  };

  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(checkStandalone);
  const [isInstalled, setIsInstalled] = useState(() => checkStandalone() || checkStoredInstalled());
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check support and register Service Worker
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    // Detect mobile device
    const mobileCheck = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Detect iOS
    const iosCheck = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iosCheck);

    // Detect standalone / already installed
    const standaloneMode = checkStandalone();
    setIsStandalone(standaloneMode);

    if (standaloneMode) {
      setIsInstalled(true);
      setCanInstall(false);
      try {
        localStorage.setItem('waterwatch_pwa_installed', 'true');
      } catch {}
    }

    // Modern Chromium getInstalledRelatedApps API
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            setIsInstalled(true);
            setCanInstall(false);
            try {
              localStorage.setItem('waterwatch_pwa_installed', 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker
        .register('/sw.js')
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          let subscription = await registration.pushManager.getSubscription();

          // If browser already has notification permission granted but no active PushManager subscription,
          // automatically create the subscription so the phone starts receiving alerts immediately
          if (!subscription && user?.id && Notification.permission === 'granted' && resolvedApiUrl) {
            try {
              const keyRes = await fetch(`${resolvedApiUrl}/notifications/vapid-public-key`);
              const keyData = await keyRes.json();
              if (keyData.success && keyData.publicKey) {
                const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
                subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey,
                });
              }
            } catch (autoErr) {
              console.warn('[Push] Auto-subscribe on granted permission notice:', autoErr);
            }
          }

          setIsSubscribed(false);

          // Silently sync subscription to backend with current user and barangay
          if (subscription && resolvedApiUrl && user?.id) {
            try {
              const saveRes = await fetch(`${resolvedApiUrl}/notifications/subscribe`, {
                method: 'POST',
                headers: pushHeaders(),
                body: JSON.stringify({
                  subscription: subscription.toJSON(),
                  user_id: user?.id || null,
                  barangay: user?.barangay || null,
                }),
              });
              const saved = await saveRes.json();
              if (!saveRes.ok || !saved.success) throw new Error(saved.detail || 'Could not register device with server.');
              setIsSubscribed(true);
              setError(null);
            } catch (err) {
              setIsSubscribed(false);
              setError(err.message || 'Device registration failed. Please enable push alerts again.');
            }
          }
        })
        .catch((err) => {
          setIsSubscribed(false);
          setError(err.message || 'Service worker registration failed.');
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // Check if prompt was captured prior to hook mounting
    const alreadyInstalled = standaloneMode || checkStoredInstalled();
    if (typeof window !== 'undefined' && window.__deferredPrompt && !alreadyInstalled) {
      setInstallPrompt(window.__deferredPrompt);
      setCanInstall(true);
    }

    // Auto-ask permission when launched as an installed PWA (no button click needed)
    if (alreadyInstalled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // 1. Direct prompt attempt
      const timer = setTimeout(() => {
        subscribeRef.current?.().catch(() => {});
      }, 1200);

      // 2. Gesture fallback on very first screen interaction
      const autoPromptOnFirstTap = () => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          subscribeRef.current?.().catch(() => {});
        }
        window.removeEventListener('pointerdown', autoPromptOnFirstTap);
        window.removeEventListener('touchstart', autoPromptOnFirstTap);
        window.removeEventListener('click', autoPromptOnFirstTap);
      };

      window.addEventListener('pointerdown', autoPromptOnFirstTap, { passive: true, once: true });
      window.addEventListener('touchstart', autoPromptOnFirstTap, { passive: true, once: true });
      window.addEventListener('click', autoPromptOnFirstTap, { passive: true, once: true });

      return () => {
        clearTimeout(timer);
        window.removeEventListener('pointerdown', autoPromptOnFirstTap);
        window.removeEventListener('touchstart', autoPromptOnFirstTap);
        window.removeEventListener('click', autoPromptOnFirstTap);
      };
    }

    // PWA beforeinstallprompt handler
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      if (checkStandalone() || checkStoredInstalled()) {
        setCanInstall(false);
        return;
      }
      window.__deferredPrompt = e;
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
      window.__deferredPrompt = null;
      setIsStandalone(true);
      setIsInstalled(true);
      try {
        localStorage.setItem('waterwatch_pwa_installed', 'true');
      } catch {}

      // Automatically request notification permission right after installation completes!
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        setTimeout(() => {
          subscribeRef.current?.().catch((err) => {
            console.warn('[Push] Auto-subscribe on appinstalled:', err);
          });
        }, 500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [resolvedApiUrl, user?.id, user?.barangay]);

  // Trigger PWA installation prompt
  const promptInstall = useCallback(async () => {
    const promptEvent = installPrompt || (typeof window !== 'undefined' ? window.__deferredPrompt : null);
    if (!promptEvent) return false;
    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setInstallPrompt(null);
        setIsInstalled(true);
        try {
          localStorage.setItem('waterwatch_pwa_installed', 'true');
        } catch {}
        if (typeof window !== 'undefined') window.__deferredPrompt = null;

        // User just confirmed installation -> automatically request notification permission without waiting for any button click!
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          setTimeout(() => {
            subscribeRef.current?.().catch((err) => {
              console.warn('[Push] Auto-subscribe after install prompt accepted:', err);
            });
          }, 600);
        }

        return true;
      }
    } catch (err) {
      console.error('[PWA] Installation prompt error:', err);
    }
    return false;
  }, [installPrompt]);

  // Subscribe to real-time Web Push
  const subscribeToPush = useCallback(async (customBarangay = null) => {
    if (!user?.id) {
      setError('Please sign in to enable push alerts.');
      return false;
    }
    if (!isSupported) {
      setError('Push notifications are not supported by this browser.');
      return false;
    }

    setLoading(true);
    setIsSubscribed(false);
    setError(null);

    try {
      // 1. Request user permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setError('Notification permission was denied. Please allow notifications in your browser settings.');
        setLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key from backend
      const keyRes = await fetch(`${resolvedApiUrl}/notifications/vapid-public-key`);
      const keyData = await keyRes.json();

      if (!keyData.success || !keyData.publicKey) {
        throw new Error('Failed to retrieve VAPID public key from server.');
      }

      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      // 3. Register fresh push subscription with browser
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      // Reuse a working subscription; rotate only when the server key changes.
      const existingKey = subscription?.options?.applicationServerKey;
      const matchesKey = existingKey && new Uint8Array(existingKey).length === applicationServerKey.length
        && new Uint8Array(existingKey).every((byte, index) => byte === applicationServerKey[index]);
      if (subscription && !matchesKey) {
        const oldEndpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch(`${resolvedApiUrl}/notifications/unsubscribe`, {
          method: 'POST', headers: pushHeaders(), body: JSON.stringify({ endpoint: oldEndpoint }),
        });
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      }

      // 4. Send subscription to backend
      const subPayload = {
        subscription: subscription.toJSON(),
        user_id: user?.id || null,
        barangay: customBarangay || user?.barangay || null,
      };

      const saveRes = await fetch(`${resolvedApiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: pushHeaders(),
        body: JSON.stringify(subPayload),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.detail || 'Could not save subscription to server.');
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      setError(err.message || 'Failed to activate push notifications.');
      setLoading(false);
      return false;
    }
  }, [resolvedApiUrl, isSupported, user]);

  // Keep subscribeRef pointing to the latest subscribeToPush function
  subscribeRef.current = subscribeToPush;

  // Unsubscribe
  const unsubscribeFromPush = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`${resolvedApiUrl}/notifications/unsubscribe`, {
          method: 'POST',
          headers: pushHeaders(),
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch((e) => console.warn('Unsubscribe API call:', e));
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      setError('Failed to unsubscribe.');
      setLoading(false);
      return false;
    }
  }, [resolvedApiUrl, isSupported]);

  // Dispatch a test push notification only to the signed-in user's devices
  const testPush = useCallback(async () => {
    try {
      const res = await fetch(`${resolvedApiUrl}/notifications/test-push`, { method: "POST", headers: pushHeaders() });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[Push] Test push error:', err);
      return { success: false, message: err.message };
    }
  }, [resolvedApiUrl]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    canInstall: Boolean(canInstall && !isInstalled && !isStandalone),
    isStandalone,
    isInstalled,
    isIOS,
    isMobile,
    promptInstall,
    subscribeToPush,
    unsubscribeFromPush,
    testPush,
  };
};

export default usePushNotifications;
