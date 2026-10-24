import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Map, LogIn, UserPlus, Menu, X, Home, Compass, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import usePushNotifications from '../hooks/usePushNotifications';

const PublicNavbar = () => {
  const { user, API_URL } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { canInstall, isStandalone, isInstalled, promptInstall } = usePushNotifications(API_URL, user);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center space-x-3 text-decoration-none group">
          <img
            src="/images/logo/waterwatch-icon-192.png"
            alt="WaterWatch Logo"
            className="w-10 sm:w-12 h-10 sm:h-12 rounded-full border border-blue-200 object-cover group-hover:scale-105 transition-transform shadow-xs"
            onError={(e) => {
              e.target.src = '/images/logo/waterwatch-logo.svg';
            }}
          />
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold text-blue-900 tracking-tight">WaterWatch</span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden xs:block">
              Maasin Water Quality Monitoring
            </span>
          </div>
        </Link>
        
        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? "text-blue-900 font-semibold" : "text-slate-600 hover:text-blue-900"
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/public-map"
            className={({ isActive }) =>
              `text-sm font-medium flex items-center gap-1.5 transition-colors ${
                isActive ? "text-blue-900 font-semibold" : "text-slate-600 hover:text-blue-900"
              }`
            }
          >
            <Map size={16} />
            <span>Public Map</span>
          </NavLink>

          {!isStandalone && !isInstalled && canInstall && (
            <button
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-200 text-blue-900 bg-blue-50 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Install App</span>
            </button>
          )}
          
          {user ? (
            <Link
              to="/portal"
              className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow"
            >
              Resident Portal
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-900 px-4 py-2 text-sm font-medium transition-colors"
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg"
              >
                <UserPlus size={16} />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop to cover page and close on click */}
          <div
            className="fixed inset-0 top-20 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-fade-in cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Floating Fixed Dropdown Menu Container */}
          <div className="fixed top-20 left-0 right-0 z-50 md:hidden bg-white/98 backdrop-blur-2xl border-b border-slate-200 px-6 py-4 space-y-3 shadow-2xl animate-fade-in max-h-[calc(100dvh-5rem)] overflow-y-auto">
            <NavLink
              to={user ? "/portal" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              <Compass size={18} />
              <span>Portal</span>
            </NavLink>

            <NavLink
              to="/public-map"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              <Map size={18} />
              <span>Public Water Map</span>
            </NavLink>

            {!isStandalone && !isInstalled && canInstall && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  promptInstall();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-cyan-800 text-white text-sm font-bold shadow-md cursor-pointer"
              >
                <Smartphone size={16} />
                <span>Install Mobile App</span>
              </button>
            )}

            {!user && (
              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-900 text-center text-sm font-semibold text-white shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </>
      )}
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicNavbar;
