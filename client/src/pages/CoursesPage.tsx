import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Clock, DollarSign, BookOpen, Search, Filter, Download, LayoutGrid } from 'lucide-react';
import api from '../services/api';
import type { Course, Teacher } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../hooks/useRedux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

const exportCoursesToCSV = (data: any[]) => {
  const headers = ['Guruh nomi', 'O\'qituvchi', 'Narxi', 'Davomiyligi', 'Talabalar soni', 'Status'];
  const rows = data.map(c => [
    c.title,
    (c.teacher as any)?.name || '—',
    c.price,
    c.duration || '—',
    `${c.studentCount || 0}/${c.maxStudents}`,
    c.isActive ? 'Faol' : 'Yopilgan'
  ]);
  
  const content = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `kurslar_${new Date().toLocaleDateString()}.csv`;
  link.click();
};

export default function CoursesPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const isAdmin = ['admin', 'manager', 'superadmin'].includes(user?.role || '');

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', price: '', duration: '',
    teacher: '', schedule: '', maxStudents: '20',
    isActive: true, color: '#6366f1',
  });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses');
      setCourses(data.data);
    } catch { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCourses();
    api.get('/teachers').then(({ data }) => setTeachers(data.data));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', price: '', duration: '', teacher: '', schedule: '', maxStudents: '20', isActive: true, color: '#6366f1' });
    setShowModal(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title, description: c.description || '',
      price: String(c.price), duration: c.duration || '',
      teacher: (c.teacher as any)?._id || '',
      schedule: c.schedule || '', maxStudents: String(c.maxStudents),
      isActive: c.isActive, color: c.color,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: Number(form.price), maxStudents: Number(form.maxStudents) };
      if (editing) {
        await api.put(`/courses/${editing._id}`, payload);
        toast.success("Guruh ma'lumotlari yangilandi ✅");
      } else {
        await api.post('/courses', payload);
        toast.success("Yangi guruh ochildi 🎉");
      }
      setShowModal(false);
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu guruhni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success("O'chirildi");
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filtered = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    (c.teacher as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('courses')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('courses_subtitle', 'Barcha faol guruhlar, dars jadvallari va talabalar sig\'imi')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex rounded-2xl h-14 px-6 border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => exportCoursesToCSV(filtered)}>
            <Download size={20} className="mr-2 text-indigo-600" /> Export
          </Button>
          {isAdmin && (
            <Button onClick={openAdd} className="rounded-2xl h-14 px-8 shadow-indigo-500/20 shadow-xl bg-indigo-600 hover:bg-indigo-700">
              <Plus size={22} className="mr-2" /> {t('add')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg hover:scale-[1.02] transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <LayoutGrid size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('total_groups', 'Jami guruhlar')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{courses.length} ta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg hover:scale-[1.02] transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('total_students', 'Jami talabalar')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{courses.reduce((acc, c) => acc + (c.studentCount || 0), 0)} ta</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-2 rounded-3xl border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex items-center gap-3 px-6 py-4 flex-1 w-full group">
            <Search size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              placeholder={t('search_courses', 'Guruh nomi yoki ustoz bo\'yicha qidirish...')} 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full"
            />
          </div>
          <Button variant="ghost" size="sm" className="mx-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600">
            <Filter size={14} className="mr-2" /> {t('filters', 'Filtrlar')}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(c => {
            const fillPercent = Math.min(((c.studentCount || 0) / c.maxStudents) * 100, 100);
            return (
              <Card key={c._id} className="border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-all relative">
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: c.color }} />
                <CardContent className="p-0">
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                        <BookOpen size={24} style={{ color: c.color }} />
                      </div>
                      <Badge variant={c.isActive ? 'success' : 'secondary'} className="rounded-lg text-[8px] uppercase tracking-widest">
                        {c.isActive ? 'Active' : 'Closed'}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 truncate">{c.title}</h3>
                    <p className="text-xs font-medium text-slate-500 line-clamp-2 h-8 mb-6">{c.description || 'No description provided.'}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                           <DollarSign size={14} style={{ color: c.color }} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Narxi</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{formatMoney(c.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                           <Clock size={14} style={{ color: c.color }} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Davomiyligi</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{c.duration || '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Guruh sig'imi</span>
                        <span className="text-slate-900 dark:text-white">{c.studentCount || 0} / {c.maxStudents} talaba</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-700" style={{ width: `${fillPercent}%`, background: c.color }} />
                      </div>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-3">
                         <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] font-black border border-slate-100 dark:border-slate-700 shadow-sm">
                           {(c.teacher as any)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                         </div>
                         <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                            <span className="text-slate-400 font-medium mr-1">{t('teacher')}:</span>
                            <span className="text-slate-900 dark:text-white font-black">{(c.teacher as any)?.name || t('unassigned')}</span>
                         </p>
                       </div>
                       <div className="flex items-center gap-3">
                         <Clock size={14} className="text-slate-400" />
                         <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                            <span className="text-slate-400 font-medium mr-1">{t('time')}:</span>
                            <span className="text-slate-900 dark:text-white font-black">{c.schedule || t('unassigned')}</span>
                         </p>
                       </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <Button variant="ghost" className="flex-1 rounded-xl h-10 text-xs font-black" onClick={() => openEdit(c)}>
                        <Edit2 size={14} className="mr-2" /> {t('edit')}
                      </Button>
                      <Button variant="ghost" className="rounded-xl h-10 w-10 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDelete(c._id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm transition-all animate-in fade-in duration-300 pt-10">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-2xl border-none animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <BookOpen size={24} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {editing ? t('edit_course') : t('add_course')}
                  </CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Kurs ma'lumotlari</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Plus size={24} className="rotate-45" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSave} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('title')} *</label>
                  <Input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    required 
                    placeholder="Kurs nomi"
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('price')} (so'm)</label>
                    <Input 
                      type="number" 
                      value={form.price} 
                      onChange={e => setForm({...form, price: e.target.value})} 
                      required
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                    />
                  </div>

                  {/* Teacher Selection */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('teacher')} *</label>
                    <select
                      value={form.teacher}
                      onChange={e => setForm({...form, teacher: e.target.value})}
                      required
                      className="w-full rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all px-4 text-sm appearance-none"
                    >
                      <option value="">{t('select_teacher')}</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Dars jadvali</label>
                  <Input 
                    value={form.schedule} 
                    onChange={e => setForm({...form, schedule: e.target.value})} 
                    placeholder="Du-Cho-Ju 18:00"
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Davomiyligi</label>
                    <Input 
                      value={form.duration} 
                      onChange={e => setForm({...form, duration: e.target.value})} 
                      placeholder="Masalan: 6 oy"
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                    />
                  </div>

                  {/* Max Students (Capacity) */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Guruh sig'imi (Maks.)</label>
                    <Input 
                      type="number"
                      value={form.maxStudents} 
                      onChange={e => setForm({...form, maxStudents: e.target.value})} 
                      required
                      placeholder="20"
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold">Faollik holati</span>
                  <div className="relative inline-flex items-center cursor-pointer" onClick={() => setForm({...form, isActive: !form.isActive})}>
                    <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${form.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    <div className={`absolute left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </CardContent>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-14 font-black text-slate-500 hover:bg-slate-50 transition-all" onClick={() => setShowModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-[2] rounded-2xl h-14 font-black shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-[0.98]">
                  {editing ? t('save') : t('add')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}
