import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Map, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PublicNavbar = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center space-x-3 text-decoration-none group">
          <img
            src="/images/logo/cropped_circle_image.png"
            alt="WaterWatch Logo"
            className="w-12 h-12 rounded-full border-2 border-blue-200 object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-blue-900 tracking-tight">WaterWatch</span>
            <span className="text-[11px] font-medium text-slate-500">Maasin Water Quality Monitoring</span>
          </div>
        </Link>
        
        <nav className="flex items-center gap-4 sm:gap-6">
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
            <div className="flex items-center gap-2 sm:gap-3">
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
      </header>
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicNavbar;
