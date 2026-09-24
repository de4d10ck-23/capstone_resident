import { useState, useEffect, useCallback } from 'react';

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
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        .then(async (registration) => {
          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);

          // Silently sync existing subscription to backend
          if (subscription && apiUrl) {
            try {
              fetch(`${apiUrl}/notifications/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscription: subscription.toJSON(),
                  user_id: user?.id || null,
                  barangay: user?.barangay || null,
                }),
              }).catch(() => {});
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // Check if prompt was captured prior to hook mounting
    const alreadyInstalled = standaloneMode || checkStoredInstalled();
    if (typeof window !== 'undefined' && window.__deferredPrompt && !alreadyInstalled) {
      setInstallPrompt(window.__deferredPrompt);
      setCanInstall(true);
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
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [apiUrl, user?.id, user?.barangay]);

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
        return true;
      }
    } catch (err) {
      console.error('[PWA] Installation prompt error:', err);
    }
    return false;
  }, [installPrompt]);

  // Subscribe to real-time Web Push
  const subscribeToPush = useCallback(async (customBarangay = null) => {
    if (!isSupported) {
      setError('Push notifications are not supported by this browser.');
      return false;
    }

    setLoading(true);
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
      const keyRes = await fetch(`${apiUrl}/notifications/vapid-public-key`);
      const keyData = await keyRes.json();

      if (!keyData.success || !keyData.publicKey) {
        throw new Error('Failed to retrieve VAPID public key from server.');
      }

      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      // 3. Register push subscription with browser
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 4. Send subscription to backend
      const subPayload = {
        subscription: subscription.toJSON(),
        user_id: user?.id || null,
        barangay: customBarangay || user?.barangay || null,
      };

      const saveRes = await fetch(`${apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subPayload),
      });

      const saveData = await saveRes.json();
      if (!saveData.success) {
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
  }, [apiUrl, isSupported, user]);

  // Unsubscribe
  const unsubscribeFromPush = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`${apiUrl}/notifications/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
  }, [apiUrl, isSupported]);

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
  };
};

export default usePushNotifications;
