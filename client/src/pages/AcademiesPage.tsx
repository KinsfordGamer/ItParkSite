import React, { useEffect, useState } from 'react';
import { Plus, Building2, Globe, User, ShieldCheck, Settings, ExternalLink } from 'lucide-react';
import api from '../services/api';
import type { Academy } from '../types';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useTranslation } from 'react-i18next';

export default function AcademiesPage() {
  const { t } = useTranslation();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: ''
  });

  const fetchAcademies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/academies');
      setAcademies(data.data);
    } catch {
      toast.error('Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academies', form);
      toast.success('Akademiya muvaffaqiyatli qo\'shildi 🎉');
      setShowModal(false);
      fetchAcademies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    }
  };

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('academies', 'Akademiyalar')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('academies_subtitle', 'Tizimdagi barcha o\'quv markazlarini boshqarish')}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-2xl h-14 px-8 shadow-indigo-500/20 shadow-xl">
          <Plus size={22} className="mr-2" /> {t('add_academy', 'Yangi Akademiya')}
        </Button>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {academies.map(a => (
            <Card key={a._id} className="border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-all">
              <CardContent className="p-0">
                <div className="p-8">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                      <Building2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{a.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                        <Globe size={14} className="text-indigo-500" />
                        <span>{a.slug}.crm.uz</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <User size={14} />
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        {t('owner', 'Egasi')}: <span className="text-slate-900 dark:text-white font-black ml-1">{(a.owner as any)?.name}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <ShieldCheck size={14} />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-500">{t('status', 'Holat')}:</p>
                        <Badge variant={a.subscriptionStatus === 'active' ? 'success' : 'warning'} className="rounded-lg text-[8px] uppercase tracking-widest">
                          {a.subscriptionStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 rounded-xl h-12 text-xs font-black">
                      <Settings size={16} className="mr-2" /> {t('settings')}
                    </Button>
                    <Button className="flex-1 rounded-xl h-12 text-xs font-black shadow-lg shadow-indigo-500/10">
                      <ExternalLink size={16} className="mr-2" /> {t('enter', 'Kirish')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <Card className="relative w-full max-w-lg shadow-2xl border-none animate-in">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-8">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <span className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-xl text-indigo-600">🏢</span>
                {t('add_academy', 'Yangi Akademiya')}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                   <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Akademiya Nomi</label>
                    <Input placeholder="Smart Academy" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="rounded-2xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Slug (Subdomain)</label>
                    <Input placeholder="smart-academy" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required className="rounded-2xl h-12" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-6">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 dark:border-indigo-900/50 pb-2">Manager Hisobi</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager Ismi</label>
                      <Input placeholder="Ali Valiyev" value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} required className="rounded-xl h-11 bg-white dark:bg-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                      <Input type="email" placeholder="manager@academy.uz" value={form.ownerEmail} onChange={e => setForm({...form, ownerEmail: e.target.value})} required className="rounded-xl h-11 bg-white dark:bg-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parol</label>
                      <Input type="password" placeholder="••••••••" value={form.ownerPassword} onChange={e => setForm({...form, ownerPassword: e.target.value})} required className="rounded-xl h-11 bg-white dark:bg-slate-900" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-8 pt-0 flex gap-4">
                <Button variant="outline" type="button" className="flex-1 rounded-2xl h-14 font-black" onClick={() => setShowModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-1 rounded-2xl h-14 font-black shadow-indigo-500/20 shadow-xl">
                  {t('create', 'Yaratish')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
