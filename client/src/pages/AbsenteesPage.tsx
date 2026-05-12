import { useEffect, useState } from 'react';
import { Phone, AlertCircle, Calendar, Users, RefreshCw, Trash2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { AttendanceRecord } from '../types';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

export default function AbsenteesPage() {
  const { t } = useTranslation();
  const [absentees, setAbsentees] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAbsentees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/absentees');
      setAbsentees(data.data);
    } catch {
      toast.error('Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const deleteAttendance = async (id: string) => {
    if (!window.confirm('Haqiqatdan ham bu davomatni o\'chirmoqchimisiz?')) return;
    try {
      await api.delete(`/attendance/delete/${id}`);
      toast.success('Davomat o\'chirildi');
      fetchAbsentees();
    } catch {
      toast.error('O\'chirishda xato');
    }
  };

  const updateNote = async (id: string, note: string) => {
    try {
      await api.patch(`/attendance/note/${id}`, { note });
      toast.success('Amal saqlandi');
      fetchAbsentees();
    } catch {
      toast.error('Saqlashda xato');
    }
  };

  useEffect(() => {
    fetchAbsentees();
  }, []);

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('today_absentees')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('absentees_subtitle', 'Darsda qatnashmagan talabalar nazorati va tezkor aloqa')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="flex items-center gap-3 px-6 py-3 rounded-2xl shadow-sm border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50">
            <Users size={18} className="text-red-500" />
            <span className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{t('total')}: {absentees.length}</span>
          </Card>
          <Button onClick={fetchAbsentees} disabled={loading} className="rounded-2xl h-14 px-6 shadow-indigo-500/20 shadow-xl">
            <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : absentees.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_absentees')}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            {t('no_absentees_desc', 'Bugun barcha talabalar kelgan yoki davomat hali belgilanmagan.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {absentees.map((a: AttendanceRecord) => (
            <Card key={a._id} className="border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-all relative border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 font-black text-sm">
                      {(a.student as any)?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight mb-1">{(a.student as any)?.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {(a.course as any)?.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteAttendance(a._id)}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </Button>
                    <Badge variant="destructive" className="rounded-lg text-[8px] uppercase tracking-widest">
                      {t('absent', 'KELMAGAN')}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-tight">
                      Dars vaqti: <span className="text-slate-900 dark:text-white">{(a.course as any)?.schedule || 'Belgilanmagan'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <Phone size={16} className="text-indigo-500" />
                    <span className="text-xs font-bold tabular-nums">{(a.student as any)?.phone || 'Telefon raqami yo\'q'}</span>
                  </div>
                </div>

                <a 
                  href={(a.student as any)?.phone ? `tel:${(a.student as any).phone.replace(/[^\d+]/g, '')}` : '#'}
                  className={cn(
                    "w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg active:scale-95 mb-4",
                    (a.student as any)?.phone 
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Phone size={18} />
                  {t('call', 'Qo\'ng\'iroq')}
                </a>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    {a.note && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => updateNote(a._id, '')}
                        className="rounded-xl h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => updateNote(a._id, 'Tel qilindi, ko\'tarmadi')}
                      className={`rounded-xl h-9 text-[10px] font-bold border-slate-200 ${a.note === 'Tel qilindi, ko\'tarmadi' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}`}
                    >
                      <Clock size={12} className="mr-1" /> Ko'tarmadi
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateNote(a._id, 'Keladi')}
                      className={`rounded-xl h-9 text-[10px] font-bold border-slate-200 ${a.note === 'Keladi' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : ''}`}
                    >
                      <CheckCircle2 size={12} className="mr-1" /> Keladi
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateNote(a._id, 'Kasal')}
                      className={`rounded-xl h-9 text-[10px] font-bold border-slate-200 ${a.note === 'Kasal' ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}`}
                    >
                      Kasal
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateNote(a._id, 'Sababli')}
                      className={`rounded-xl h-9 text-[10px] font-bold border-slate-200 ${a.note === 'Sababli' ? 'bg-slate-50 border-slate-200 text-slate-600' : ''}`}
                    >
                      Sababli
                    </Button>
                  </div>

                  {a.note && !['Tel qilindi, ko\'tarmadi', 'Keladi', 'Kasal', 'Sababli'].includes(a.note) && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-600 italic">
                      Izoh: {a.note}
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statusni o'zgartirish</span>
                 <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
