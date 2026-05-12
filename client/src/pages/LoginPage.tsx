import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, AlertCircle, Moon, Sun } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { loginUser, clearError } from '../store/slices/authSlice';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import FloatingBackground from '../components/FloatingBackground';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      toast.success(t('welcome') + '! 🎉');
      navigate('/');
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <FloatingBackground />
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-700" />

      {/* Floating Controls */}
      <div className="absolute top-8 right-8 flex items-center gap-4 z-50" data-aos="fade-down">
        <div className="flex p-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          {['uz', 'ru', 'en'].map(lng => (
            <button
              key={lng}
              onClick={() => changeLanguage(lng)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all",
                i18n.language === lng 
                  ? "bg-indigo-600 text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {lng}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-2xl w-10 h-10 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>

      <div className="w-full max-w-[460px] relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10" data-aos="zoom-in">
          <div className="w-32 h-32 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-slate-100 overflow-hidden transition-transform hover:rotate-6">
            <img src="/Logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-br from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent tracking-tighter leading-tight uppercase">
            {t('login_welcome')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold text-sm tracking-widest uppercase opacity-60">
            {t('login_desc')}
          </p>
        </div>

        {/* Card */}
        <Card className="border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl" data-aos="fade-up" data-aos-delay="200">
          <CardContent className="p-12">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('login_card_title')}</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('login_card_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('phone') || 'Telefon raqam'}</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <Input 
                    type="tel" 
                    placeholder="+998"
                    className="h-14 pl-12 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('password')}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <Input 
                    type={showPass ? 'text' : 'password'} 
                    placeholder={t('password_placeholder')}
                    className="h-14 pl-12 pr-12 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold animate-shake">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-black text-base shadow-indigo-600/30 shadow-2xl mt-4 bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" /> : t('enter').toUpperCase()}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-10">
          © {new Date().getFullYear()} IT Park Surxondaryo CRM • Digital Management System
        </p>
      </div>
    </div>
  );
}
