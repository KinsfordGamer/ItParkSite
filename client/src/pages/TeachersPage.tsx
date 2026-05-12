import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Phone, BookOpen, Mail, UserCheck, Search, Download, Filter, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import type { Teacher } from '../types';
import toast from 'react-hot-toast';
import { useAppSelector } from '../hooks/useRedux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

const exportTeachersToCSV = (data: any[]) => {
  const headers = ['Ism', 'Telefon', 'Mutaxassislik', 'Maosh', 'Status'];
   const rows = data.map(teacher => [
    teacher.name,
    teacher.phone,
    teacher.subject || '—',
    teacher.salary,
    teacher.isActive ? 'Faol' : 'Nofaol'
  ]);
  
  const content = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ustozlar_${new Date().toLocaleDateString()}.csv`;
  link.click();
};

export default function TeachersPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const isAdmin = ['admin', 'manager', 'superadmin', 'administrator'].includes(user?.role || '');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', subject: '', password: '', isActive: true,
  });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teachers');
      setTeachers(data.data);
    } catch (err) { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', subject: '', password: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      name: t.name, phone: t.phone,
      subject: t.subject || '', password: '', isActive: t.isActive
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editing) {
        await api.put(`/teachers/${editing._id}`, payload);
        toast.success("Ma'lumotlar yangilandi ✅");
      } else {
        await api.post('/teachers', payload);
        toast.success("Yangi o'qituvchi qo'shildi 🎉");
      }
      setShowModal(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'qituvchini o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast.success("O'chirildi");
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filtered = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(search.toLowerCase()) || 
    teacher.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('teachers')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('teacher_subtitle', 'Akademiyaning barcha faol va nofaol ustozlari boshqaruvi')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex rounded-2xl h-14 px-6 border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => exportTeachersToCSV(filtered)}>
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
              <UserCheck size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('active_teachers', 'Faol ustozlar')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{teachers.filter(teacher => teacher.isActive).length} ta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg hover:scale-[1.02] transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <BookOpen size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('total_groups', 'Jami guruhlar')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{teachers.reduce((acc, teacher) => acc + (teacher.courses?.length || 0), 0)} ta</p>
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
              placeholder={t('search')} 
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(teacher => {
            const salaryLeft = (teacher.salary || 0) - (teacher.salaryPaid || 0);
            const paidPercent = (teacher.salary || 0) > 0 ? Math.min(((teacher.salaryPaid || 0) / teacher.salary) * 100, 100) : 0;
            return (
              <Card key={teacher._id} className="border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-all">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
                        {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-black text-slate-900 dark:text-white truncate text-base">{teacher.name}</h3>
                          <Badge variant={teacher.isActive ? 'success' : 'secondary'} className="rounded-lg text-[8px] uppercase tracking-widest">
                            {teacher.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">{teacher.subject}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <Phone size={14} className="text-indigo-500" /> {teacher.phone}
                      </div>
                      {teacher.email && (
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          <Mail size={14} className="text-indigo-500" /> {teacher.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami tushum (100%)</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{formatMoney((teacher.salary || 0) / 0.4)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Oladigan oyligi (40%)</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-none">{formatMoney(teacher.salary || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mb-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      <div>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">To'landi</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatMoney(teacher.salaryPaid || 0)}</p>
                      </div>
                      {salaryLeft > 0 ? (
                        <div className="text-right">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Qoldiq</p>
                          <p className="text-sm font-black text-amber-600 dark:text-amber-400 leading-none">{formatMoney(salaryLeft)}</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qoldiq</p>
                          <p className="text-sm font-black text-slate-400 leading-none">0 so'm</p>
                        </div>
                      )}
                    </div>

                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${paidPercent}%` }} />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <Button variant="ghost" className="flex-1 rounded-xl h-10 text-xs font-black" onClick={() => openEdit(teacher)}>
                        <Edit2 size={14} className="mr-2" /> {t('edit')}
                      </Button>
                      <Button variant="ghost" className="rounded-xl h-10 w-10 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDelete(teacher._id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm transition-all animate-in fade-in duration-300 pt-10">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-2xl border-none animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <UserCheck size={24} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {editing ? t('edit_teacher') : t('add_teacher')}
                  </CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Ustoz ma'lumotlari</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Plus size={24} className="rotate-45" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSave} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('full_name')} *</label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    required 
                    placeholder="Ism-sharifi"
                    className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone (Login) */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('phone_number')} (Login) *</label>
                    <Input 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                      required 
                      placeholder="+998"
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Fan/Yo'nalish *</label>
                    <Input 
                      value={form.subject} 
                      onChange={e => setForm({...form, subject: e.target.value})} 
                      required 
                      placeholder="Frontend..."
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" 
                    />
                  </div>
                </div>




                {/* Password */}
                {!editing && (
                  <div className="space-y-2 relative">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password', 'Parol')} *</label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={form.password} 
                        onChange={e => setForm({...form, password: e.target.value})} 
                        placeholder={t('password_placeholder', 'Kamida 6 ta belgi')}
                        required={!editing}
                        className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <UserCheck size={20} />
                    </div>
                    <span className="text-sm font-bold">Faollik holati</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer" onClick={() => setForm({...form, isActive: !form.isActive})}>
                    <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${form.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    <div className={`absolute left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </CardContent>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
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
    </div>
  );
}
