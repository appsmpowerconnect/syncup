import React from 'react';
import { Calendar, Users, Eye, User, LogOut, CheckSquare, LayoutDashboard } from 'lucide-react';
import { auth } from '../firebase';

interface HeaderProps {
  currentView: string;
  setView: (view: string) => void;
  user: any;
}

export default function Header({ currentView, setView, user }: HeaderProps) {
  const handleLogout = () => {
    auth.signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'groups', label: 'Grupos', icon: Users },
    { id: 'espiar', label: 'Espiar', icon: Eye },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm" id="syncup-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')} id="logo-container">
            <div className="bg-brand-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                SyncUp
              </span>
              <span className="block text-xs font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                Sincronia
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1" id="desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setView(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile and Logout */}
          <div className="flex items-center space-x-3" id="user-actions">
            <div className="flex items-center space-x-2 text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">{user.displayName || 'Usuário'}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>

            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                className="h-10 w-10 rounded-full border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`;
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold border border-brand-200">
                {(user.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation (Subheader) */}
        <div className="md:hidden flex justify-between py-2 overflow-x-auto scrollbar-none border-t border-slate-100" id="mobile-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-btn-${item.id}`}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'text-brand-600 font-bold' : 'text-slate-500'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
