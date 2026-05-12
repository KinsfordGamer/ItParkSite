import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  CreditCard, CalendarCheck, LogOut,
  ChevronRight, Bell, ShoppingBag,
  Moon, Sun, Menu, Clock, Star
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { logout } from '../store/slices/authSlice';
import { cn } from '../lib/utils';
import FloatingBackground from '../components/FloatingBackground';
import { Button } from '../components/ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'dashboard', roles: ['superadmin', 'manager', 'admin'] },
  { to: '/students', icon: GraduationCap, label: 'students', roles: ['superadmin', 'manager', 'admin', 'teacher', 'administrator'] },
  { to: '/courses', icon: BookOpen, label: 'courses', roles: ['superadmin', 'manager', 'admin', 'teacher'] },
  { to: '/teachers', icon: Users, label: 'teachers', roles: ['superadmin', 'manager', 'admin'] },
  { to: '/payments', icon: CreditCard, label: 'payments', roles: ['superadmin', 'manager', 'admin'] },
  { to: '/attendance', icon: CalendarCheck, label: 'attendance', roles: ['superadmin', 'manager', 'admin', 'teacher'] },
  { to: '/grades', icon: Star, label: 'grading', roles: ['superadmin', 'teacher'] },
  { to: '/salaries', icon: CreditCard, label: 'salaries', roles: ['superadmin', 'manager', 'admin'] },
  { to: '/expenses', icon: ShoppingBag, label: 'expenses', roles: ['superadmin', 'manager', 'admin'] },
  { to: '/absentees', icon: Bell, label: 'absentees', roles: ['superadmin', 'manager', 'admin', 'administrator'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      <FloatingBackground />
      {/* Mobile Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl border border-slate-200 p-1 group">
                <img src="/Logo.jpg" alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
                  IT park <br /> Surxondaryo
                </h2>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 block">CRM Premium</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
            {navItems
              .filter(item => item.roles.includes(user?.role || ''))
              .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={cn("transition-transform group-hover:scale-110")} />
                    <span className="flex-1">{t(label)}</span>
                    <ChevronRight size={14} className={cn("opacity-0 transition-all", !isActive && "group-hover:opacity-40")} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User & Footer */}
          <div className="p-6 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <NavLink
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm mb-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{user?.role} · Profil</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </NavLink>
            <Button 
              variant="destructive" 
              className="w-full justify-center rounded-2xl font-black py-6"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <Clock size={14} className="text-indigo-500" />
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {new Date().toLocaleDateString(i18n.language === 'uz' ? 'uz-UZ' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50">
              {['uz', 'ru', 'en'].map(lng => (
                <button
                  key={lng}
                  onClick={() => changeLanguage(lng)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all",
                    i18n.language === lng 
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  {lng}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-2xl w-10 h-10 border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
