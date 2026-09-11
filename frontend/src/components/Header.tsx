import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Search,
  Menu,
  X,
  User,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Shield,
  Layers,
  Clock
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    openAuditModal,
    openNewEmergencyModal,
    openReallocationModal,
    resetSimulation,
    emergencySimulated,
    reallocationApproved
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', id: 'Dashboard' },
    { label: 'Analytics', id: 'Analytics' },
    { label: 'Audit Log', id: 'Audit' }
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveNavTab('Dashboard')}
            >
              {/* Minimal geometric shield logo */}
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
                <Shield className="w-5 h-5 fill-white/20 stroke-white stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                  RESQ
                </span>
                <span className="text-[11px] font-semibold text-slate-500 tracking-tight leading-tight mt-0.5">
                  Safer People. Smarter Response.
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeNavTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'Audit') {
                        openAuditModal();
                      } else {
                        setActiveNavTab(item.id);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-blue-600 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Operational Status, Search, Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* Live Operational Status Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DEFCON 2 • Active Response</span>
            </div>

            {/* Quick Demo Reset / State Indicator */}
            {(emergencySimulated || reallocationApproved) && (
              <button
                onClick={resetSimulation}
                title="Reset simulation data to baseline"
                className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo</span>
              </button>
            )}

            {/* Audit Log Quick Trigger */}
            <button
              onClick={openAuditModal}
              title="View Tamper-evident Audit Ledger"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={openNewEmergencyModal}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* User Profile Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                SJ
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  Sarah Jenkins
                </span>
                <span className="text-[10px] text-slate-400 leading-none">
                  EOC Incident Commander
                </span>
              </div>
            </div>

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Audit') {
                    openAuditModal();
                  } else {
                    setActiveNavTab(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeNavTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
