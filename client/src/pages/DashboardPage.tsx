import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, GraduationCap,
  CalendarCheck, Calendar, Wallet, AlertCircle,
  ArrowUpRight, ArrowDownRight, TrendingUp
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAppSelector } from '../hooks/useRedux';

import type { ApiResponse, DashboardStats, Payment, Student } from '../types';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981'];

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  trend?: number;
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: StatCardProps) {
  return (
    <Card className="overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{value}</p>
            <div className="flex items-center gap-2 mt-3">
              {trend !== undefined && (
                <Badge variant={trend > 0 ? 'success' : 'destructive'} className="px-1.5 py-0">
                  {trend > 0 ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />} 
                  {Math.abs(trend)}%
                </Badge>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{sub}</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl transition-colors duration-300" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
            <Icon size={26} style={{ color: color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAppSelector(s => s.auth);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalTeachers: 0,
    periodIncome: 0,
    periodExpenditure: 0,
    totalDebt: 0,
    attendanceRate: 0,
    recentPayments: [],
    debtors: [],
    incomeChart: [],
    studentStats: [],
    performanceStats: [],
    studentPerformance: [],
    recentGrades: [],
    allCourses: [],
    insights: { atRiskStudents: [], pendingSalaries: [] },
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats', { params: dateRange });
      setStats(data.data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Dashboard yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  const chartData = stats.incomeChart.map((d) => ({
    month: d._id,
    [t('income')]: d.income,
  }));

  const pieData = stats.studentStats.map((s) => ({
    name: s._id,
    value: s.count,
  }));


  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6" data-aos="fade-down">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent text-[32px]">
            {t('dashboard')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            {t('dashboard_subtitle', 'Markazning umumiy moliyaviy va akademik holati')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('last_updated', 'Oxirgi yangilanish')}</p>
            <p className="text-xs font-black text-slate-900 dark:text-slate-100">{lastUpdated.toLocaleTimeString()}</p>
          </div>
          <Card className="flex items-center gap-3 p-1.5 rounded-2xl shadow-sm border-slate-200/50">
            <div className="flex items-center gap-2 pl-3 border-r border-slate-200 dark:border-slate-800 pr-3">
              <Calendar size={16} className="text-slate-400" />
              <input type="date" className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 dark:text-slate-300 w-28" 
                value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} />
              <span className="text-slate-300">-</span>
              <input type="date" className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 dark:text-slate-300 w-28" 
                value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} />
            </div>
            <Button size="sm" onClick={fetchStats} className="rounded-xl h-8 text-[11px]">
              <TrendingUp size={12} className="mr-1.5" /> {t('refresh', 'Yangilash')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div data-aos="fade-up" data-aos-delay="0">
          <StatCard icon={GraduationCap} label={t('students')} value={stats.totalStudents}
            sub={`${stats.activeStudents} ${t('active_students', 'ta faol')}`} color="#6366f1" trend={+5} />
        </div>
        
        {user?.role !== 'teacher' && (
          <div data-aos="fade-up" data-aos-delay="100">
            <StatCard icon={Users} label={t('teachers')} value={stats.totalTeachers}
              sub={t('academy_team', 'Akademiya jamoasi')} color="#8b5cf6" />
          </div>
        )}
        
        <div data-aos="fade-up" data-aos-delay="200">
          <StatCard icon={BookOpen} label={t('courses')} value={stats.totalCourses}
            sub={`${stats.activeCourses} ${t('active_groups', 'ta faol guruh')}`} color="#0ea5e9" />
        </div>
        
        {user?.role !== 'teacher' ? (
          <>
            <StatCard icon={TrendingUp} label={t('net_profit')} value={formatMoney(stats.periodIncome - stats.periodExpenditure)}
              sub={t('profit_subtitle', 'Barcha xarajatlardan so\'ng')} color="#10b981" />
            <StatCard icon={Wallet} label={t('total_income')} value={formatMoney(stats.periodIncome)}
              sub={t('income_subtitle', 'Tanlangan davr uchun')} color="#6366f1" />
            <StatCard icon={ArrowDownRight} label={t('total_expenditure', 'Jami xarajat')} value={formatMoney(stats.periodExpenditure)}
              sub={t('expenditure_subtitle', 'Oyliklar va boshqa xarajatlar')} color="#ef4444" />
            <StatCard icon={AlertCircle} label={t('total_debt')} value={formatMoney(stats.totalDebt)}
              sub={t('debt_subtitle', 'Talabalar qarzi')} color="#f59e0b" />
          </>
        ) : (
          <StatCard icon={TrendingUp} label={t('average_performance', "O'rtacha o'zlashtirish")} value={`${stats.attendanceRate}%`}
            sub={t('class_activity', "Darslardagi faollik")} color="#10b981" />
        )}

        <StatCard icon={CalendarCheck} label={t('attendance_rate')} value={`${stats.attendanceRate}%`}
          sub={t('attendance_subtitle', 'Darslarda ishtirok')} color="#10b981" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income chart */}
        <Card className="p-6" data-aos="fade-right">
          <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <span className="text-indigo-500">📈</span> {t('income_dynamics')}
              </CardTitle>
              <p className="text-sm text-slate-500 font-medium mt-1">{t('last_6_months', 'Oxirgi 6 oy')}</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ 
                        background: 'var(--card)', 
                        backdropFilter: 'blur(10px)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '16px', 
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                      }}
                      itemStyle={{ color: 'var(--foreground)', fontSize: 12, fontWeight: 700 }}
                      labelStyle={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}
                      formatter={(v: any) => [formatMoney(Number(v)), '']}
                    />
                    <Area type="monotone" dataKey={t('income')} stroke="#6366f1" strokeWidth={4} fill="url(#colorIncome)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 font-medium bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                {t('not_enough_data', 'Hali ma\'lumotlar yetarli emas')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student status distribution */}
        <Card className="p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <span className="text-indigo-500">👤</span> {t('student_status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center">
            <div className="relative h-[240px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={8}>
                    {pieData.map((_, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} className="stroke-white dark:stroke-slate-950 stroke-2 outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      backdropFilter: 'blur(10px)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ color: 'var(--foreground)', fontSize: 12, fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 dark:text-slate-100">{stats.totalStudents}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('total')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              {pieData.map((d: { name: string; value: number }, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">{d.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Student Monthly Performance - NEW */}
      <div className="grid grid-cols-1 gap-8">
        <Card className="border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900" data-aos="fade-left">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <span className="text-indigo-500">📊</span> {t('student_monthly_performance', "O'quvchilar oylik o'zlashtirishi")}
              </CardTitle>
              <p className="text-xs font-bold text-slate-500 mt-1">{t('student_performance_subtitle', "Tanlangan oy va guruh bo'yicha o'quvchilar natijalari")}</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-48"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">{t('all_groups', 'Barcha guruhlar')}</option>
                {stats.allCourses?.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <Badge variant="outline" className="hidden md:flex font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 uppercase tracking-widest text-[9px]">
                Live Stats
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-y border-slate-100 dark:divide-slate-800">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('student')}</th>
                    <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('avg_score', 'O\'rtacha Ball')}</th>
                    <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('grades_count', 'Baholar Soni')}</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('progress', 'Progress')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.studentPerformance
                    ?.filter(s => {
                      if (selectedCourse === 'all') return true;
                      return (s as any).course === selectedCourse;
                    })
                    .map((s, i) => (
                    <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                            <p className="text-[10px] text-slate-500">{s.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <Badge className={s.averageGrade > 80 ? 'bg-emerald-500' : s.averageGrade > 60 ? 'bg-indigo-500' : 'bg-rose-500'}>
                          {s.averageGrade}%
                        </Badge>
                      </td>
                      <td className="px-8 py-4 text-center text-xs font-black text-slate-600 dark:text-slate-400">
                        {s.count} ta
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${s.averageGrade > 80 ? 'bg-emerald-500' : s.averageGrade > 60 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                              style={{ width: `${s.averageGrade}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!stats.studentPerformance || stats.studentPerformance.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Tanlangan davr uchun baholar mavjud emas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Activity & Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent payments */}
        <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <span className="text-indigo-500">💰</span> {t('recent_payments')}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs font-bold"
              onClick={() => navigate('/payments')}
            >
              {t('all', 'Barchasi')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentPayments.map((p: Payment) => (
              <div key={p._id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-lg">
                    {(p.student as any)?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{(p.student as any)?.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                      {(p.course as any)?.title} • {new Date(p.date).toLocaleDateString()}
                    </div>
                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                      Ustoz: {(p.course as any)?.teacher?.name || (p.student as any)?.teacher?.name || '—'}
                    </div>
                  </div>
                </div>
                <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">+{formatMoney(p.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <span className="text-amber-500">⭐</span> {t('recent_grades', 'So\'nggi baholar')}
            </CardTitle>
            <Badge variant="outline" className="font-black text-indigo-600 border-indigo-200">NEW</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentGrades?.map((g: any) => (
              <div key={g._id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${g.grade >= 80 ? 'bg-emerald-100 text-emerald-600' : g.grade >= 60 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    {g.grade}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{(g.student as any)?.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                      {(g.course as any)?.title} • {new Date(g.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase italic">
                  {g.comment ? `"${g.comment.slice(0, 15)}..."` : ''}
                </div>
              </div>
            ))}
            {(!stats.recentGrades || stats.recentGrades.length === 0) && (
              <div className="py-8 text-center text-slate-400 text-xs font-bold">Hali baholar mavjud emas</div>
            )}
          </CardContent>
        </Card>

        {/* Top Debtors */}
        <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <span className="text-red-500">⚠️</span> {t('debtors')}
            </CardTitle>
            <Badge variant="destructive" className="font-black">TOP 8</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.debtors.map((s: Student) => (
              <div key={s._id} className="flex items-center justify-between p-3 hover:bg-red-50/30 dark:hover:bg-red-950/20 rounded-2xl transition-colors border border-transparent hover:border-red-100/50 dark:hover:border-red-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-xs">
                    {s.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase">
                      {(s.course as any)?.title} • {s.phone}
                    </div>
                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                      Ustoz: {(s.teacher as any)?.name || '—'}
                    </div>
                  </div>
                </div>
                <div className="font-black text-red-600 dark:text-red-400 text-sm">{formatMoney(Math.abs(s.balance))}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Smart Insights & AI Analysis */}
        <Card className="xl:col-span-1 bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 dark:from-indigo-950/20 dark:to-emerald-950/20 border-indigo-100 dark:border-indigo-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <span className="text-indigo-600">⚡</span> {t('smart_insights')}
            </CardTitle>
            <Badge variant="default" className="font-black bg-slate-900 text-[9px] px-2">AI ANALYTICS</Badge>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {t('at_risk')}
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.insights.atRiskStudents.map((s: Student) => (
                  <Badge key={s._id} variant="secondary" className="px-3 py-1 rounded-xl text-xs font-bold border-slate-200/50 shadow-sm">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {t('pending_salaries')}
              </p>
              <div className="space-y-3">
                {stats.insights.pendingSalaries.map((teacher: { _id: string; name: string; amount: number }) => (
                  <div key={teacher._id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-white dark:border-slate-800 shadow-sm">
                    <span className="text-slate-900 dark:text-slate-100 text-xs font-black">{teacher.name}</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">{formatMoney(teacher.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
