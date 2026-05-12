import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, Filter, Download, ArrowUpRight, Wallet, CreditCard, Banknote, Edit2 } from 'lucide-react';
import api from '../services/api';
import type { Payment, Student } from '../types';
import toast from 'react-hot-toast';
import { useAppSelector } from '../hooks/useRedux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

const exportPaymentsToCSV = (data: any[]) => {
  const headers = ['Talaba', 'Guruh', 'Summa', 'Turi', 'Sana'];
  const rows = data.map(p => [
    (p.student as any)?.name || '—',
    (p.course as any)?.title || '—',
    p.amount,
    p.type,
    new Date(p.date).toLocaleDateString()
  ]);
  
  const content = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tolovlar_${new Date().toLocaleDateString()}.csv`;
  link.click();
};

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const isAdmin = ['admin', 'superadmin', 'manager'].includes(user?.role || '');

  const TYPE_LABELS: Record<string, string> = { 
    cash: `💵 ${t('cash', 'Naqd')}`, 
    card: `💳 ${t('card', 'Karta')}`, 
    transfer: `🏦 ${t('transfer', 'O\'tkazma')}` 
  };

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    student: '', amount: '', method: 'cash', note: '', date: new Date().toISOString().split('T')[0]
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', { params: { limit: 100 } });
      setPayments(data.data);
      setTotalAmount(data.totalAmount);
    } catch { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPayments();
    api.get('/students', { params: { status: 'active', limit: 200 } })
      .then(({ data }) => {
        setStudents(data.data);
        const params = new URLSearchParams(window.location.search);
        const sId = params.get('studentId');
        if (sId) {
          setForm(f => ({ ...f, student: sId }));
          setShowModal(true);
        }
      });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ student: '', amount: '', method: 'cash', note: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (payment: Payment) => {
    setEditing(payment);
    setForm({
      student: (payment.student as any)._id || payment.student,
      amount: payment.amount.toString(),
      method: payment.type as any, // The backend uses 'type' but UI uses 'method' in my previous refactor
      note: payment.note || '',
      date: new Date(payment.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, type: form.method }; // Map UI method to backend type
      if (editing) {
        await api.put(`/payments/${editing._id}`, payload);
        toast.success("Muvaffaqiyatli yangilandi ✅");
      } else {
        await api.post('/payments', payload);
        toast.success("To'lov muvaffaqiyatli qabul qilindi ✅");
      }
      setShowModal(false);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu to'lovni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/payments/${id}`);
      toast.success("O'chirildi");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filtered = payments.filter(p => {
    const name = (p.student as any)?.name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('payments')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('payment_subtitle', 'Barcha talabalar to\'lovlari va moliyaviy hisobotlar')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex rounded-2xl h-14 px-6 border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => exportPaymentsToCSV(filtered)}>
            <Download size={20} className="mr-2 text-indigo-600" /> Export
          </Button>
          <Button onClick={openAdd} className="rounded-2xl h-14 px-8 shadow-emerald-500/20 shadow-xl bg-emerald-600 hover:bg-emerald-700">
            <Plus size={22} className="mr-2" /> {t('add')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Wallet size={24} className="text-emerald-500" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('income')}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(totalAmount)}</p>
            <Badge variant="success" className="mt-3 px-1.5 py-0">
              <ArrowUpRight size={12} className="mr-1" /> +12%
            </Badge>
          </CardContent>
        </Card>

        {(['cash', 'card', 'transfer'] as const).map(type => {
          const typePayments = payments.filter(p => p.type === type);
          const typeTotal = typePayments.reduce((sum, p) => sum + p.amount, 0);
          const icons = { cash: Banknote, card: CreditCard, transfer: ArrowUpRight };
          const Icon = icons[type];
          return (
            <Card key={type} className="border-none shadow-xl hover:scale-[1.02] transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-indigo-600" />
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t(type)}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(typeTotal)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">{typePayments.length} {t('transactions')}</p>
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
             <input 
               type="month"
               className="bg-transparent border-none outline-none text-xs font-black text-slate-500 uppercase tracking-widest w-40 cursor-pointer"
               value={form.date.slice(0, 7)}
               onChange={e => setForm({...form, date: e.target.value + '-01'})}
             />
             <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600">
               <Filter size={14} className="mr-2" /> {t('filters')}
             </Button>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">💰</div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_data_found')}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">{t('no_data_found')}</p>
            </div>
          ) : (
            <table className="w-full text-slate-900 dark:text-white">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">#</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('student')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('group')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('amount')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('type')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('date')}</th>
                  {isAdmin && <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p, i) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-slate-400">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                          {(p.student as any)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm leading-tight mb-1">{(p.student as any)?.name || '—'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(p.student as any)?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: (p.course as any)?.color || '#6366f1' }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{(p.course as any)?.title || '—'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                           <ArrowUpRight size={14} />
                           {formatMoney(p.amount)}
                        </div>
                        {((p.course as any)?.price > p.amount) && (
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                            Qarz qoldi: {formatMoney((p.course as any).price - p.amount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant="outline" className="rounded-xl font-bold bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 px-3 py-1">
                        {TYPE_LABELS[p.type]}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">
                      {new Date(p.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950 group/edit" onClick={() => openEdit(p)}>
                            <Edit2 size={16} className="text-slate-400 group-hover/edit:text-emerald-600 transition-colors" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 dark:hover:bg-red-950 group/del" onClick={() => handleDelete(p._id)}>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm transition-all animate-in fade-in duration-300 pt-10">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-2xl border-none animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Wallet size={24} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {editing ? t('edit_payment') : t('add_payment')}
                  </CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">To'lov ma'lumotlari</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Plus size={24} className="rotate-45" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSave} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                {/* Student Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('student')} *</label>
                  <select
                    value={form.student}
                    onChange={e => setForm({...form, student: e.target.value})}
                    required
                    className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4 text-sm appearance-none"
                  >
                    <option value="">{t('select_student')}</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
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
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all" 
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
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4" 
                    />
                  </div>
                </div>

                {/* Method Selection */}
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">To'lov usuli</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['cash', 'card', 'transfer'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm({...form, method: m as any})}
                          className={`h-12 rounded-xl border font-bold transition-all text-xs ${form.method === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Izoh</label>
                  <Input 
                    value={form.note} 
                    onChange={e => setForm({...form, note: e.target.value})} 
                    placeholder="Qo'shimcha ma'lumot..."
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all" 
                  />
                </div>
              </CardContent>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-14 font-black text-slate-500 hover:bg-slate-50 transition-all" onClick={() => setShowModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-[2] rounded-2xl h-14 font-black shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98]">
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
