import React, { useState } from 'react';
import { LogOut, ChevronRight, Bell, Trash2, CheckCircle2 } from 'lucide-react';
import { RouteType, User, CenterSettings } from '../../types';
import { Language, translations } from '../../data/translations';
import ThemeLanguageSelector from '../ThemeLanguageSelector';

interface AdminHeaderProps {
  currentRoute: RouteType;
  currentUser: User | null;
  centerSettings: CenterSettings;
  onLogout: () => void;
  className?: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  language: Language;
  setLanguage: (language: Language) => void;
  notifications: any[];
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onMarkRead: (id: string) => void;
}

export default function AdminHeader({
  currentRoute,
  currentUser,
  centerSettings,
  onLogout,
  className = '',
  theme,
  setTheme,
  language,
  setLanguage,
  notifications,
  onMarkAllRead,
  onClearNotifications,
  onMarkRead
}: AdminHeaderProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const t = translations[language];

  // Generate breadcrumb text with localization support
  const getBreadcrumbs = () => {
    const base = t.ieltsPortal;
    let current = t.breadDefault;

    switch (currentRoute) {
      case 'admin/dashboard':
        current = t.breadOverview;
        break;
      case 'admin/exams':
        current = t.breadExams;
        break;
      case 'admin/classes':
        current = t.breadClasses;
        break;
      case 'admin/classes/detail':
        current = t.breadClassDetail;
        break;
      case 'admin/students':
        current = t.breadStudents;
        break;
      case 'admin/statistics':
        current = t.breadStats;
        break;
      case 'admin/settings':
        current = t.breadSettings;
        break;
      case 'owner/dashboard':
        current = t.breadOwnerOverview;
        break;
      case 'owner/permissions':
        current = t.breadOwnerPerms;
        break;
      case 'owner/users':
        current = t.breadOwnerUsers;
        break;
      default:
        current = t.breadDefault;
    }

    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{base}</span>
        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{current}</span>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className={`bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm ${className}`}>
      {/* Breadcrumb / Left Side */}
      <div className="flex items-center gap-4">
        {getBreadcrumbs()}
      </div>

      {/* Right Side Info */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Language & Theme Selectors */}
        <ThemeLanguageSelector
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
        />

        {/* Center Logo/Name Brand display */}
        <div className="hidden md:flex items-center gap-2 border-r border-slate-100 dark:border-slate-800 pr-5">
          <span className="text-lg">{centerSettings.logo}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{centerSettings.name}</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`relative p-2 rounded-full transition-colors ${
              showNotifDropdown 
                ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <>
              {/* Overlay background to dismiss */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowNotifDropdown(false)} 
              />
              
              {/* Dropdown Card */}
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-40 animate-fade-in overflow-hidden">
                <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                    🔔 {t.notificationTitle}
                    {unreadCount > 0 && (
                      <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                        {unreadCount} {t.notificationNew}
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { onMarkAllRead(); }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        {t.notificationMarkAll}
                      </button>
                    )}
                    <button
                      onClick={() => { onClearNotifications(); }}
                      className="text-rose-500 hover:underline font-bold flex items-center gap-0.5"
                    >
                      <Trash2 size={11} />
                      {t.notificationClear}
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      <p className="text-xl mb-1">🕊️</p>
                      {t.notificationNoItems}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-3.5 flex gap-2.5 transition-colors text-xs ${
                          n.isRead 
                            ? 'bg-white dark:bg-slate-900' 
                            : 'bg-indigo-50/40 dark:bg-indigo-950/10'
                        }`}
                      >
                        <div className="mt-0.5">
                          {n.isRead ? (
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 block" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 block animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className={`leading-relaxed text-slate-700 dark:text-slate-300 ${!n.isRead ? 'font-semibold' : 'font-normal'}`}>
                            {language === 'vi' ? n.textVi : n.textEn}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>{language === 'vi' ? n.timeVi : n.timeEn}</span>
                            {!n.isRead && (
                              <button
                                onClick={() => onMarkRead(n.id)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-0.5"
                              >
                                <CheckCircle2 size={10} />
                                {t.notificationMarkRead}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Admin Avatar & Logout Card */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-100 dark:border-slate-800">
          <div className="text-right hidden lg:block">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{currentUser?.name}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {currentUser?.role === 'owner' 
                ? (language === 'vi' ? 'Chủ Hệ Thống' : 'Supreme Owner') 
                : (language === 'vi' ? 'Quản Trị Viên' : 'Administrator')}
            </div>
          </div>

          <div className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center shadow-md shadow-indigo-500/10 border border-indigo-400 shrink-0 text-sm">
            {currentUser?.name.charAt(0) || 'A'}
          </div>

          <button
            onClick={onLogout}
            title={t.logout}
            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
