import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Bell, 
  CheckCheck, 
  Check, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Filter, 
  Sparkles,
  Inbox,
  Smartphone,
  Download,
  X
} from "lucide-react";
import usePushNotifications from "../hooks/usePushNotifications";

const Notifications = () => {
  const { user, token, API_URL } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`waterwatch_read_notifs_${user?.id || "guest"}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'critical'

  // PWA Mobile Install state & Web Push Hook
  const { 
    canInstall, 
    isStandalone, 
    isInstalled,
    isIOS, 
    isMobile, 
    promptInstall, 
    isSubscribed, 
    subscribeToPush, 
    isSupported 
  } = usePushNotifications(API_URL, user);

  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [guideTab, setGuideTab] = useState(isIOS ? "ios" : "android");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState("");

  useEffect(() => {
    if (isIOS) setGuideTab("ios");
    else setGuideTab("android");
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (canInstall) {
      const res = await promptInstall();
      if (!res) setShowInstallGuide(true);
    } else {
      setShowInstallGuide(true);
    }
  };

  const handlePushAction = async () => {
    setPushLoading(true);
    setPushStatusMsg("");
    try {
      if (!isSubscribed) {
        const ok = await subscribeToPush();
        if (ok) {
          // Immediately dispatch a test push so user sees it right away
          await fetch(`${API_URL}/notifications/test-push`, { method: "POST" });
          setPushStatusMsg("Push notification active! Test alert sent.");
          setTimeout(() => setPushStatusMsg(""), 4000);
        }
      } else {
        // Already subscribed: send a test push to their device
        const res = await fetch(`${API_URL}/notifications/test-push`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setPushStatusMsg("Test push alert sent to your device!");
          setTimeout(() => setPushStatusMsg(""), 4000);
        }
      }
    } catch (err) {
      console.error("Push action error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  const storageKey = `waterwatch_read_notifs_${user?.id || "guest"}`;

  const notifyUnreadChange = (updatedReadIds, count) => {
    window.dispatchEvent(
      new CustomEvent("waterwatch_notifications_read", {
        detail: {
          readIds: updatedReadIds,
          unreadCount: count
        }
      })
    );
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        const stored = localStorage.getItem(storageKey);
        const currentRead = stored ? JSON.parse(stored) : readIds;
        const remainingUnread = data.data.filter((n) => !currentRead.includes(n.id)).length;
        notifyUnreadChange(currentRead, remainingUnread);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [API_URL, token]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (readIds.includes(id)) return;

    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    const remainingUnread = notifications.filter((n) => !updated.includes(n.id)).length;
    notifyUnreadChange(updated, remainingUnread);

    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to sync read status with backend:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    notifyUnreadChange(updated, 0);

    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to sync read-all with backend:", err);
    }
  };

  const isRead = (id) => readIds.includes(id);

  const unreadCount = notifications.filter((n) => !isRead(n.id)).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !isRead(n.id);
    if (filter === "critical") return n.type === "critical" || n.type === "warning";
    return true;
  });

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "Recent";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getTypeDetails = (type) => {
    switch (type) {
      case "critical":
        return {
          icon: <AlertOctagon size={18} className="text-red-600" />,
          bgColor: "bg-red-50/80 border-red-200/80",
          pillBg: "bg-red-100 text-red-800 border-red-200",
          dotColor: "bg-red-500",
          label: "Emergency Outbreak"
        };
      case "warning":
        return {
          icon: <AlertTriangle size={18} className="text-amber-600" />,
          bgColor: "bg-amber-50/70 border-amber-200/80",
          pillBg: "bg-amber-100 text-amber-800 border-amber-200",
          dotColor: "bg-amber-500",
          label: "Boil Water Advisory"
        };
      case "safe":
        return {
          icon: <ShieldCheck size={18} className="text-emerald-600" />,
          bgColor: "bg-emerald-50/70 border-emerald-200/80",
          pillBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          dotColor: "bg-emerald-500",
          label: "Advisory Lifted"
        };
      default:
        return {
          icon: <Info size={18} className="text-blue-600" />,
          bgColor: "bg-blue-50/70 border-blue-200/80",
          pillBg: "bg-blue-100 text-blue-800 border-blue-200",
          dotColor: "bg-blue-500",
          label: "Health Notice"
        };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-cyan-300 border border-white/10">
            <Bell size={13} />
            <span>Community Health Inbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Advisories & Alerts</h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-xl">
            Official water safety advisories, contamination warnings, and inspection updates for Barangay {user?.barangay || "Maasin"}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
          {isSupported && (
            <button
              type="button"
              onClick={handlePushAction}
              disabled={pushLoading}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer ${
                isSubscribed
                  ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-400/30"
                  : "bg-cyan-400 hover:bg-cyan-300 text-slate-950"
              }`}
              title={isSubscribed ? "Push alerts are active. Tap to test push notification on this device." : "Tap to enable sound/vibration alerts on this device."}
            >
              <Bell size={15} className={isSubscribed ? "text-emerald-300 animate-pulse" : "text-slate-950"} />
              <span>
                {pushLoading ? "Connecting..." : isSubscribed ? "Push Active (Send Test)" : "Enable Push Alerts"}
              </span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md transition-all cursor-pointer flex-shrink-0"
            >
              <CheckCheck size={16} />
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Push Status Toast / Confirmation */}
      {pushStatusMsg && (
        <div className="bg-emerald-900/90 border border-emerald-500/50 text-emerald-100 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fade-in shadow-lg">
          <span>{pushStatusMsg}</span>
          <button onClick={() => setPushStatusMsg("")} className="text-emerald-300 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Install Mobile App Prompt Card (Target: Mobile, Only if not installed yet) */}
      {!isStandalone && !isInstalled && (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-700/50 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-cyan-300 border border-white/10 flex-shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Mobile App Experience</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  PWA Ready
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">Install WaterWatch on your Mobile Phone</h3>
              <p className="text-white/80 text-xs sm:text-sm max-w-xl mt-0.5">
                Install to your phone's home screen for quick offline access, full-screen map views, and real-time community water advisories.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex-shrink-0">
            {isIOS ? (
              <button
                type="button"
                onClick={() => setShowInstallGuide(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs text-white font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Tap for iPhone Install Steps (📤 ➕)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Download size={16} />
                <span>Install Mobile App</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => setFilter("unread")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === "unread"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === "unread" ? "bg-white text-blue-900" : "bg-red-500 text-white animate-pulse"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter("critical")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === "critical"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Urgent Only
          </button>
        </div>

        {unreadCount === 0 && notifications.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
            <Sparkles size={13} className="text-emerald-500" />
            <span>All caught up!</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-medium text-slate-500">Checking for health notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
              <Inbox size={26} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No Notifications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filter === "unread" 
                ? "You have read all notices! There are no unread advisories at this time." 
                : "There are currently no official advisories or health notifications posted for your area."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const read = isRead(n.id);
            const details = getTypeDetails(n.type);

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!read) handleMarkAsRead(n.id);
                }}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all ${
                  read
                    ? "bg-white/80 border-slate-200/80 opacity-80 hover:opacity-100"
                    : `${details.bgColor} shadow-md ring-1 ring-blue-500/10 cursor-pointer hover:shadow-lg`
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 flex-shrink-0 mt-0.5">
                      {details.icon}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${details.pillBg}`}>
                          {details.label}
                        </span>

                        {n.barangay ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <MapPin size={11} className="text-slate-400" />
                            <span>Brgy. {n.barangay}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                            City-Wide
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          <span>{formatTimestamp(n.created_at)}</span>
                        </span>

                        {!read && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            New
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {n.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words whitespace-pre-line">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Mark as Read Button */}
                  {!read ? (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:text-blue-900 cursor-pointer flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check size={14} className="text-emerald-600" />
                      <span className="hidden sm:inline">Mark Read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1 flex-shrink-0 px-2 py-1">
                      <CheckCheck size={14} className="text-slate-400" />
                      <span>Read</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile PWA Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5 animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-900 flex items-center justify-center flex-shrink-0">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Install Mobile App</h3>
                <p className="text-xs text-slate-500 mt-0.5">Follow these quick steps to add WaterWatch to your phone</p>
              </div>
            </div>

            {/* OS Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setGuideTab("android")}
                className={`py-2 rounded-xl transition-all ${
                  guideTab === "android"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Android / Chrome
              </button>
              <button
                type="button"
                onClick={() => setGuideTab("ios")}
                className={`py-2 rounded-xl transition-all ${
                  guideTab === "ios"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                iPhone / Safari
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            {guideTab === "ios" ? (
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <p className="leading-snug">
                    Open this page in <strong>Apple Safari</strong> browser on your iPhone.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <p className="leading-snug">
                    Tap the <strong>Share button</strong> (<span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-blue-900">📤</span>) in Safari's bottom toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <p className="leading-snug">
                    Scroll down and tap <strong>"Add to Home Screen"</strong> (<span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-blue-900">➕</span>).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                  <p className="leading-snug">
                    Tap <strong>"Add"</strong> in the top-right corner. The WaterWatch icon will now appear on your home screen!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <p className="leading-snug">
                    Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Google Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <p className="leading-snug">
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the menu options.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <p className="leading-snug">
                    Tap <strong>"Install"</strong> to confirm. WaterWatch is now ready to open as a standalone app!
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Dismiss Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-3 rounded-2xl bg-blue-900 hover:bg-blue-850 text-white font-bold text-sm shadow-md transition-all text-center cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
