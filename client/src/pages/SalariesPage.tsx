import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Wallet, ArrowDownRight, Banknote, CreditCard, Landmark, Download, Filter, Calendar, DollarSign, Edit2 } from 'lucide-react';
import api from '../services/api';
import type { Salary, Teacher } from '../types';
import toast from 'react-hot-toast';
import { useAppSelector } from '../hooks/useRedux';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

const exportSalariesToCSV = (data: any[]) => {
  const headers = ['O\'qituvchi', 'Summa', 'Oy', 'Turi', 'Sana'];
  const rows = data.map(s => [
    (s.teacher as any)?.name || '—',
    s.amount,
    s.month,
    s.type,
    new Date(s.date).toLocaleDateString()
  ]);
  
  const content = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `oyliklar_${new Date().toLocaleDateString()}.csv`;
  link.click();
};

const TYPE_LABELS: Record<string, string> = { 
  cash: '💵 Naqd', 
  card: '💳 Karta', 
  transfer: '🏦 O\'tkazma' 
};

export default function SalariesPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const isAdmin = ['admin', 'manager', 'superadmin'].includes(user?.role || '');

  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Salary | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');
  const [form, setForm] = useState({
    teacher: '', amount: '', type: 'cash', note: '', month: new Date().toISOString().slice(0, 7), date: new Date().toISOString().split('T')[0]
  });

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/salaries');
      setSalaries(data.data);
      setTotalPaid(data.totalPaid);
    } catch { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSalaries();
    api.get('/teachers', { params: { isActive: true } })
      .then(({ data }) => setTeachers(data.data));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      teacher: '', amount: '', type: 'cash', note: '', month: new Date().toISOString().slice(0, 7), date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEdit = (salary: Salary) => {
    setEditing(salary);
    setForm({
      teacher: (salary.teacher as any)._id || salary.teacher,
      amount: salary.amount.toString(),
      type: salary.type,
      note: salary.note || '',
      month: salary.month,
      date: new Date(salary.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/salaries/${editing._id}`, { ...form, amount: Number(form.amount) });
        toast.success("Muvaffaqiyatli yangilandi ✅");
      } else {
        await api.post('/salaries', { ...form, amount: Number(form.amount) });
        toast.success("Oylik to'lovi muvaffaqiyatli saqlandi ✅");
      }
      setShowModal(false);
      fetchSalaries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    const yes = window.confirm("O'chirishni tasdiqlaysizmi?");
    if (!yes) return;
    try {
      await api.delete(`/salaries/${id}`);
      toast.success("O'chirildi ✅");
      fetchSalaries();
      api.get('/teachers', { params: { isActive: true } }).then(({ data }) => setTeachers(data.data));
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'O\'chirish xatosi');
    }
  };

  const filtered = salaries.filter(s => {
    const name = (s.teacher as any)?.name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('salaries')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('salary_subtitle', 'O\'qituvchilar uchun qilingan to\'lovlar va xarajatlar tahlili')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex rounded-2xl h-14 px-6 border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => exportSalariesToCSV(filtered)}>
            <Download size={20} className="mr-2 text-indigo-600" /> Export
          </Button>
          <Button onClick={openAdd} className="rounded-2xl h-14 px-8 bg-red-600 hover:bg-red-700 shadow-red-500/20 shadow-xl">
            <Plus size={22} className="mr-2" /> {t('pay_salary')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet size={80} />
          </div>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <Wallet size={24} className="text-red-500" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Jami xarajat</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(totalPaid)}</p>
            <Badge variant="destructive" className="mt-3 px-1.5 py-0">
              <ArrowDownRight size={12} className="mr-1" /> -8%
            </Badge>
          </CardContent>
        </Card>

        {(['cash', 'card', 'transfer'] as const).map(type => {
          const typeSalaries = salaries.filter(s => s.type === type);
          const typeTotal = typeSalaries.reduce((sum, s) => sum + s.amount, 0);
          const icons = { cash: Banknote, card: CreditCard, transfer: Landmark };
          const Icon = icons[type];
          return (
            <Card key={type} className="border-none shadow-xl hover:scale-[1.02] transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-indigo-600" />
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{TYPE_LABELS[type].split(' ')[1]}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(typeTotal)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">{typeSalaries.length} ta to'lov</p>
              </CardContent>
            </Card>
          );
        })}
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
          <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-4 px-6 py-2 w-full md:w-auto">
             <div className="flex items-center gap-3 w-48 group">
                <Calendar size={18} className="text-slate-400 group-hover:text-indigo-500" />
                <input 
                  type="month" 
                  className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full cursor-pointer"
                  value={form.month} 
                  onChange={e => setForm({...form, month: e.target.value})} 
                />
             </div>
             <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600">
               <Filter size={14} className="mr-2" /> {t('filters')}
             </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
        <button 
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'balances' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          onClick={() => setActiveTab('balances')}
        >
          Ustozlar Balansi
        </button>
        <button 
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          onClick={() => setActiveTab('history')}
        >
          To'lovlar Tarixi
        </button>
      </div>

      {activeTab === 'balances' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(teacher => {
            const salaryLeft = (teacher.salary || 0) - (teacher.salaryPaid || 0);
            const paidPercent = teacher.salary ? Math.min(100, Math.round(((teacher.salaryPaid || 0) / teacher.salary) * 100)) : 0;
            return (
              <Card key={teacher._id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 group">
                <CardContent className="p-0">
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
                        {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight leading-tight">{teacher.name}</h3>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{teacher.subject}</p>
                      </div>
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

                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <Button variant="ghost" className="flex-1 rounded-xl h-10 text-xs font-black text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40" onClick={() => {
                      setForm(prev => ({ ...prev, teacher: teacher._id, amount: salaryLeft.toString() }));
                      setShowModal(true);
                    }}>
                      <DollarSign size={14} className="mr-2" /> Oylik / Avans berish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
      <Card className="border-none shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">💸</div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_data_found')}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                {t('no_salaries_yet', 'Hali hech qanday oylik to\'lovi amalga oshirilmagan')}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">#</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('teacher')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('amount')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('for_month')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('type')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('date')}</th>
                  {isAdmin && <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((s, i) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-slate-400">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-sm border border-white dark:border-slate-700 shadow-sm">
                          {(s.teacher as any)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-base leading-tight mb-1">{(s.teacher as any)?.name || '—'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(s.teacher as any)?.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-base">
                         <ArrowDownRight size={16} />
                         {formatMoney(s.amount)}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-slate-700 dark:text-slate-300 capitalize">{s.month}</td>
                    <td className="px-8 py-6">
                      <Badge variant="outline" className="rounded-xl font-bold bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 px-4 py-1">
                        {TYPE_LABELS[s.type]}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">
                      {new Date(s.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 group/edit" onClick={() => openEdit(s)}>
                            <Edit2 size={16} className="text-slate-400 group-hover/edit:text-indigo-600 transition-colors" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 dark:hover:bg-red-950 group/del" onClick={() => handleDelete(s._id)}>
                            <Trash2 size={16} className="text-slate-400 group-hover/del:text-red-500 transition-colors" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm transition-all animate-in fade-in duration-300 pt-10">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-2xl border-none animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                  <DollarSign size={24} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {editing ? t('edit_salary') : t('add_salary')}
                  </CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Maosh ma'lumotlari</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Plus size={24} className="rotate-45" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSave} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                {/* Teacher Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('teacher')} *</label>
                    {form.teacher && (
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                        Qoldiq maosh: {formatMoney((teachers.find(t => t._id === form.teacher)?.salary || 0) - (teachers.find(t => t._id === form.teacher)?.salaryPaid || 0))}
                      </span>
                    )}
                  </div>
                  <select
                    value={form.teacher}
                    onChange={e => setForm({...form, teacher: e.target.value})}
                    required
                    className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all px-4 text-sm appearance-none"
                  >
                    <option value="">{t('select_teacher')}</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('amount')} (so'm) *</label>
                    <Input 
                      type="number" 
                      value={form.amount} 
                      onChange={e => setForm({...form, amount: e.target.value})} 
                      required
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all" 
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('date')} *</label>
                    <Input 
                      type="date" 
                      value={form.date} 
                      onChange={e => setForm({...form, date: e.target.value})} 
                      required
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all px-4" 
                    />
                  </div>
                </div>

                {/* Month/Year Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Oy/Yil</label>
                    <Input 
                      type="month" 
                      value={form.month} 
                      onChange={e => setForm({...form, month: e.target.value})} 
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all px-4" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">To'lov turi</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all px-4 text-sm appearance-none"
                    >
                      <option value="cash">Naqd</option>
                      <option value="card">Karta</option>
                      <option value="transfer">O'tkazma</option>
                    </select>
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Izoh</label>
                  <Input 
                    value={form.note} 
                    onChange={e => setForm({...form, note: e.target.value})} 
                    placeholder="Qo'shimcha ma'lumot..."
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all" 
                  />
                </div>
              </CardContent>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-14 font-black text-slate-500 hover:bg-slate-50 transition-all" onClick={() => setShowModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-[2] rounded-2xl h-14 font-black shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700 text-white transition-all active:scale-[0.98]">
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
