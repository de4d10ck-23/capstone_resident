import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Map, LogIn, UserPlus, Menu, X, Home, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PublicNavbar = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center space-x-3 text-decoration-none group">
          <img
            src="/images/logo/cropped_circle_image.png"
            alt="WaterWatch Logo"
            className="w-10 sm:w-12 h-10 sm:h-12 rounded-full border-2 border-blue-200 object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.style.display = 'none';
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
          {user ? (
            <Link
              to="/portal"
              className="bg-blue-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold"
            >
              Portal
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-blue-900 border border-blue-200 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              Login
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 py-4 space-y-3 z-40 animate-fade-in shadow-xl">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium ${
                isActive ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            <Home size={18} />
            <span>Home</span>
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
      )}
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicNavbar;
