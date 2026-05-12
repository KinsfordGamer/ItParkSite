import { useEffect, useState } from 'react';
import { Plus, Search, Download, Edit2, Trash2, Phone, UserCheck, CreditCard } from 'lucide-react';
import api from '../services/api';
import type { Student, Course, Teacher } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

const exportToCSV = (data: any[]) => {
  const headers = ['Ism', 'Telefon', 'Guruh', 'Balans', 'Status', 'Manzil'];
  const rows = data.map(s => [
    s.name,
    s.phone,
    (s.course as any)?.title || '—',
    s.balance,
    s.status,
    s.address || '—'
  ]);

  const content = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `talabalar_${new Date().toLocaleDateString()}.csv`;
  link.click();
};

export default function StudentsPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', course: '', teacher: '', balance: '0', status: 'active', address: '', parentPhone: '',
    joinDate: new Date().toISOString().split('T')[0]
  });
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'cash', month: '', note: '' });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students', { params: { limit: 1000, month: filterMonth } });
      setStudents(data.data);
    } catch { toast.error('Xato yuz berdi'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStudents();
    api.get('/courses').then(({ data }) => setCourses(data.data));
    api.get('/teachers').then(({ data }) => setTeachers(data.data));
  }, [filterMonth]);

  const openAdd = () => {
    setEditing(null);
    setForm({ 
      name: '', phone: '', course: '', teacher: '', balance: '0', status: 'active', address: '', parentPhone: '',
      joinDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      name: s.name, phone: s.phone,
      course: (s.course as any)?._id || '',
      teacher: (s.teacher as any)?._id || '',
      balance: String(s.balance), status: s.status,
      address: s.address || '', parentPhone: s.parentPhone || '',
      joinDate: s.joinDate ? new Date(s.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/students/${editing._id}`, { ...form, balance: Number(form.balance) });
        toast.success("O'quvchi ma'lumotlari yangilandi ✅");
      } else {
        await api.post('/students', { ...form, balance: Number(form.balance) });
        toast.success("Yangi o'quvchi qo'shildi 🎉");
      }
      setShowModal(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const handleDelete = async (id: string) => {
    const yes = window.confirm("O'quvchini o'chirmoqchimisiz?");
    if (!yes) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("O'quvchi o'chirildi ✅");
      fetchStudents();
    } catch (err: any) {
      console.error('Delete student error:', err);
      toast.error(err.response?.data?.message || 'O\'chirish xatosi');
    }
  };

  const openPayment = (s: Student) => {
    setSelectedStudent(s);
    setPaymentForm({ amount: '', type: 'cash', month: new Date().toISOString().slice(0, 7), note: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await api.post('/payments', {
        student: selectedStudent._id,
        amount: Number(paymentForm.amount),
        type: paymentForm.type,
        month: paymentForm.month,
        note: paymentForm.note
      });
      toast.success("To'lov qabul qilindi 🎉");
      setShowPaymentModal(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    (s.course as any)?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6" data-aos="fade-down">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">
            {t('students')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            {t('students_subtitle', 'Akademiyaning barcha talabalari va ularning holati')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl h-12 px-6 border-slate-200 hover:bg-slate-50" onClick={() => exportToCSV(filtered)}>
            <Download size={18} className="mr-2 text-indigo-600" /> Export
          </Button>
          <Button onClick={openAdd} className="rounded-2xl h-12 px-8 shadow-indigo-500/20 shadow-xl bg-indigo-600 hover:bg-indigo-700">
            <Plus size={18} className="mr-2" /> {t('add_student')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder={t('search_students', 'Ism yoki telefon bo\'yicha qidirish...')}
            className="pl-12 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-4">
          <input 
            type="month"
            className="bg-transparent border-none outline-none text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden" data-aos="fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">#</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('name')}</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('group')}</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Oylik To'lov</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-medium">
                    {t('no_students_found')}
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-black text-xs border border-white dark:border-slate-700 shadow-sm">
                          {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm">{s.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                            <Phone size={10} className="text-indigo-500" /> {s.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: (s.course as any)?.color || '#6366f1' }} />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{(s.course as any)?.title || '—'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-4">
                          O'qituvchi: <span className="text-indigo-600 dark:text-indigo-400 font-black">{(s.teacher as any)?.name || '—'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                          To'ladi: {formatMoney((s as any).paidThisMonth || 0)}
                        </span>
                        {((s as any).debtThisMonth > 0) ? (
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">
                            Qarz: {formatMoney((s as any).debtThisMonth)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                            To'liq to'langan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="rounded-lg font-black text-[10px]">
                        {s.status === 'active' ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => openPayment(s)} title="To'lov qilish">
                          <CreditCard size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(s)}>
                          <Edit2 size={14} className="text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 group/del" onClick={() => handleDelete(s._id)}>
                          <Trash2 size={14} className="text-slate-500 group-hover/del:text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  <UserCheck size={24} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {editing ? t('edit_student') : t('add_student')}
                  </CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Talaba ma'lumotlari</p>
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
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ism-sharifi"
                    className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('phone_number')} *</label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                      placeholder="+998"
                      className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                    />
                  </div>

                  {/* Course Selection */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('course')} *</label>
                    <select
                      value={form.course}
                      onChange={e => {
                        const selectedCourse = courses.find(c => c._id === e.target.value);
                        setForm({ 
                          ...form, 
                          course: e.target.value,
                          teacher: selectedCourse?.teacher ? ((selectedCourse.teacher as any)._id || (selectedCourse.teacher as any)) : form.teacher
                        });
                      }}
                      required
                      className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4 text-sm appearance-none"
                    >
                      <option value="">{t('select_course')}</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Teacher Selection */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('teacher')} *</label>
                    <select
                      value={form.teacher}
                      onChange={e => setForm({ ...form, teacher: e.target.value })}
                      required
                      className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4 text-sm appearance-none"
                    >
                      <option value="">{t('select_teacher', 'Ustozni tanlang')}</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.name} ({t.subject})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Join Date */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelgan sanasi *</label>
                    <Input
                      type="date"
                      value={form.joinDate}
                      onChange={e => setForm({ ...form, joinDate: e.target.value })}
                      required
                      className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                    />
                  </div>
                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value as any })}
                      className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4 text-sm appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="graduated">Graduated</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Parent Phone */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ota-ona tel.</label>
                    <Input
                      value={form.parentPhone}
                      onChange={e => setForm({ ...form, parentPhone: e.target.value })}
                      placeholder="+998"
                      className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all"
                    />
                  </div>
                </div>
              </CardContent>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
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

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-white/20 dark:bg-slate-950/20 backdrop-blur-sm transition-all animate-in fade-in duration-300 pt-10">
          <div className="absolute inset-0" onClick={() => setShowPaymentModal(false)} />
          <Card className="relative z-10 w-full max-w-sm shadow-2xl border-none animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <CreditCard size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">To'lov qilish</CardTitle>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedStudent.name}</p>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handlePaymentSubmit} className="flex flex-col">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Summa (so'm) *</label>
                  <Input 
                    type="number"
                    value={paymentForm.amount} 
                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                    required 
                    placeholder="Masalan: 150000"
                    className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">To'lov turi *</label>
                  <select
                    value={paymentForm.type}
                    onChange={e => setPaymentForm({...paymentForm, type: e.target.value})}
                    required
                    className="w-full rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all px-4 text-sm appearance-none"
                  >
                    <option value="cash">Naqd pul</option>
                    <option value="card">Plastik karta</option>
                    <option value="transfer">Pul o'tkazma</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Qaysi oy uchun? *</label>
                  <Input 
                    type="month"
                    value={paymentForm.month} 
                    onChange={e => setPaymentForm({...paymentForm, month: e.target.value})} 
                    required 
                    className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-emerald-500/10 font-bold transition-all" 
                  />
                </div>
              </CardContent>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <Button variant="ghost" type="button" className="flex-1 rounded-2xl h-12 font-black text-slate-500 hover:bg-slate-50 transition-all" onClick={() => setShowPaymentModal(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="flex-[2] rounded-2xl h-12 font-black shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98]">
                  Tasdiqlash
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
