import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, ArrowDownRight, Edit2, ShoppingBag, Landmark, Wallet, Megaphone } from 'lucide-react';
import api from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
import { useAppSelector } from '../hooks/useRedux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: 'rent' | 'utilities' | 'marketing' | 'office' | 'other';
  date: string;
  note?: string;
  addedBy?: User | string;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector(s => s.auth);
  const isAdmin = ['admin', 'superadmin', 'manager'].includes(user?.role || '');

  const CATEGORY_LABELS: Record<string, string> = { 
    rent: `🏠 ${t('rent', 'Ijara')}`, 
    utilities: `⚡ ${t('utilities', 'Kommunal')}`, 
    marketing: `📣 ${t('marketing', 'Reklama')}`,
    office: `📦 ${t('office', 'Ofis')}`,
    other: `⚙️ ${t('other', 'Boshqa')}`
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', amount: '', category: 'other', note: '', date: new Date().toISOString().split('T')[0]
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses');
      setExpenses(data.data);
      setTotalAmount(data.totalAmount);
    } catch { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openAdd = () => {
    if (!isAdmin) return toast.error('Ruxsat yo\'q');
    setEditing(null);
    setForm({ title: '', amount: '', category: 'other', note: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (expense: Expense) => {
    if (!isAdmin) return toast.error('Ruxsat yo\'q');
    setEditing(expense);
    setForm({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      note: expense.note || '',
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/expenses/${editing._id}`, form);
        toast.success("Yangilandi ✅");
      } else {
        await api.post('/expenses', form);
        toast.success("Xarajat qo'shildi ✅");
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return toast.error('Ruxsat yo\'q');
    if (!confirm("Ushbu xarajatni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("O'chirildi");
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filtered = expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-red-600 dark:from-white dark:to-red-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('expenses', 'Xarajatlar')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('expenses_subtitle', 'Akademiya barcha xarajatlari va moliyaviy chiqimlari')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-4">
            <Button onClick={openAdd} className="rounded-2xl h-14 px-8 shadow-red-500/20 shadow-xl bg-red-600 hover:bg-red-700 text-white">
              <Plus size={22} className="mr-2" /> {t('add')}
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900 overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <ShoppingBag size={24} className="text-red-500" />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{t('total_expenses', 'Jami xarajat')}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(totalAmount)}</p>
          </CardContent>
        </Card>

        {(['rent', 'utilities', 'marketing', 'office'] as const).map(cat => {
          const catExpenses = expenses.filter(e => e.category === cat);
          const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
          const icons = { rent: Landmark, utilities: Wallet, marketing: Megaphone, office: ShoppingBag };
          const Icon = icons[cat];
          return (
            <Card key={cat} className="border-none shadow-xl hover:scale-[1.02] transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-slate-600" />
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{CATEGORY_LABELS[cat]}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{formatMoney(catTotal)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Bar */}
      <Card className="p-2 rounded-3xl border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex items-center gap-3 px-6 py-4 flex-1 w-full group">
            <Search size={20} className="text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input 
              placeholder={t('search')} 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full"
            />
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🧾</div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_data_found')}</h3>
            </div>
          ) : (
            <table className="w-full text-slate-900 dark:text-white">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">#</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('title', 'Nomi')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('category', 'Kategoriya')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('amount')}</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('date')}</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((e, i) => (
                  <tr key={e._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-slate-400">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 dark:text-white text-sm leading-tight mb-1">{e.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.note}</p>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant="outline" className="rounded-xl font-bold bg-slate-50/50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 px-3 py-1">
                        {CATEGORY_LABELS[e.category]}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-sm">
                         <ArrowDownRight size={14} />
                         {formatMoney(e.amount)}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">
                      {new Date(e.date).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Edit2 size={16} className="text-slate-400 hover:text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e._id)}>
                          <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm pt-10">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 w-full max-w-xl shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                  <ShoppingBag size={24} />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">
                  {editing ? t('edit_expense', 'Xarajatni tahrirlash') : t('add_expense', 'Xarajat qo\'shish')}
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <Plus size={24} className="rotate-45" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSave} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('title', 'Nomi')} *</label>
                  <Input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    required
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('amount')} *</label>
                    <Input 
                      type="number" 
                      value={form.amount} 
                      onChange={e => setForm({...form, amount: e.target.value})} 
                      required
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('date')} *</label>
                    <Input 
                      type="date" 
                      value={form.date} 
                      onChange={e => setForm({...form, date: e.target.value})} 
                      required
                      className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold px-4" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')} *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value as any})}
                    className="w-full rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold px-4 appearance-none"
                  >
                    {Object.keys(CATEGORY_LABELS).map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Izoh</label>
                  <Input 
                    value={form.note} 
                    onChange={e => setForm({...form, note: e.target.value})} 
                    placeholder="..."
                    className="rounded-2xl h-14 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold" 
                  />
                </div>
              </CardContent>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-14 font-black" onClick={() => setShowModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-[2] rounded-2xl h-14 font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20">
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
