import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  Search,
  MessageSquare,
  LogOut,
  Droplets,
  Home,
  Bell,
  Menu,
  X
} from 'lucide-react';

const Layout = () => {
  const { user, token, API_URL, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Fetch and sync unread count in real time
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const stored = localStorage.getItem(`waterwatch_read_notifs_${user?.id || "guest"}`);
          const readIds = stored ? JSON.parse(stored) : [];
          const unread = data.data.filter((n) => !readIds.includes(n.id)).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error("Error fetching unread notifications count:", err);
      }
    };

    fetchUnread();

    const handleNotificationsUpdate = (e) => {
      if (e.detail && typeof e.detail.unreadCount === "number") {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };

    window.addEventListener("waterwatch_notifications_read", handleNotificationsUpdate);
    window.addEventListener("waterwatch_notifications_updated", handleNotificationsUpdate);
    window.addEventListener("storage", fetchUnread);

    const interval = setInterval(fetchUnread, 20000); // Periodic background sync

    return () => {
      window.removeEventListener("waterwatch_notifications_read", handleNotificationsUpdate);
      window.removeEventListener("waterwatch_notifications_updated", handleNotificationsUpdate);
      window.removeEventListener("storage", fetchUnread);
      clearInterval(interval);
    };
  }, [API_URL, token, user?.id]);

  const navItems = [
    { to: "/portal/my-barangay", icon: <MapPin size={20} />, label: "My Barangay Overview" },
    { to: "/portal/notifications", icon: <Bell size={20} />, label: "Advisories & Alerts", badge: unreadCount },
    { to: "/portal/request-inspection", icon: <Search size={20} />, label: "Request Inspection" },
    { to: "/portal/submit-concern", icon: <MessageSquare size={20} />, label: "Submit Concern" },
  ];

  const renderNavContent = () => (
    <>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/images/logo/cropped_circle_image.png"
            alt="WaterWatch Logo"
            className="w-10 h-10 rounded-full border-2 border-blue-200 object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">WaterWatch</h1>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Resident Portal</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all mb-2"
        >
          <Home size={20} />
          <span>Public Home</span>
        </NavLink>

        {navItems.map((item) => (
          <NavLink 
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-semibold" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <div className="relative">
              {item.icon}
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            {user?.full_name?.charAt(0) || 'R'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 font-medium truncate">Brgy. {user?.barangay}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 text-sm font-medium transition-all shadow-sm cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shadow-lg z-20 flex-shrink-0">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {renderNavContent()}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">Resident Community Portal</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Header Notification Bell Icon with Badge */}
            <Link
              to="/portal/notifications"
              className="relative p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Advisories & Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-500 text-white shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>

            <span className="text-xs font-medium text-slate-500 hidden xs:inline">
              Barangay <span className="font-bold text-slate-800">{user?.barangay}</span>
            </span>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
