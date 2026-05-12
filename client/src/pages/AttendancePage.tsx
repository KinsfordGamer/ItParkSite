import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, AlertCircle, Save, Calendar, Users, BookOpen, Download } from 'lucide-react';
import api from '../services/api';
import type { Course, Student, ApiResponse, AttendanceRecord } from '../types';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

type AttStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<AttStatus, { key: string; color: string; bg: string; icon: React.ElementType }> = {
  present: { key: 'Keldi', color: '#10b981', bg: 'bg-emerald-500/10', icon: CheckCircle },
  absent:  { key: 'Kelmadi', color: '#ef4444', bg: 'bg-red-500/10', icon: XCircle },
  late:    { key: 'Kech keldi', color: '#f59e0b', bg: 'bg-amber-500/10', icon: Clock },
  excused: { key: "Sababli", color: '#0ea5e9', bg: 'bg-sky-500/10', icon: AlertCircle },
};

const exportToCSV = (students: Student[], attendance: Record<string, AttStatus>, date: string, courseTitle: string) => {
  if (students.length === 0) {
    toast.error("Davomat ma'lumoti yo'q, lekin shablon yuklanmoqda");
  }
  const headers = ['Ism', 'Telefon', 'Sana', 'Guruh', 'Holati'];
  const rows = students.map(s => {
    const statusKey = attendance[s._id] || 'present';
    const statusUz = STATUS_CONFIG[statusKey]?.key || 'Keldi';
    return [
      s.name,
      s.phone,
      date,
      courseTitle,
      statusUz
    ];
  });

  // UTF-8 BOM to fix Excel encoding issues
  const content = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `davomat_${courseTitle}_${date}.csv`;
  link.click();
};

export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<Course[]>>('/courses').then(({ data }) => setCourses(data.data));
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    setLoading(true);
    api.get<ApiResponse<Student[]>>('/students', { params: { course: selectedCourse, status: 'active', limit: 200 } })
      .then(({ data }) => {
        setStudents(data.data);
        const initial: Record<string, AttStatus> = {};
        data.data.forEach((s) => { initial[s._id] = 'present'; });
        setAttendance(initial);
      })
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedCourse || !selectedDate) return;
    api.get<ApiResponse<AttendanceRecord[]>>('/attendance', { params: { course: selectedCourse, date: selectedDate } })
      .then(({ data }) => {
        if (data.data.length > 0) {
          const existing: Record<string, AttStatus> = {};
          data.data.forEach((r) => {
            const sId = typeof r.student === 'object' ? r.student._id : r.student;
            existing[sId] = r.status;
          });
          setAttendance(prev => ({ ...prev, ...existing }));
        }
      });
  }, [selectedCourse, selectedDate]);

  const setStatus = (studentId: string, status: AttStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedCourse || students.length === 0) {
      toast.error('Guruh va talabalar tanlanmagan');
      return;
    }
    setSaving(true);
    try {
      const records = students.map(s => ({
        student: s._id,
        course: selectedCourse,
        date: selectedDate,
        status: attendance[s._id] || 'present',
      }));
      await api.post('/attendance/bulk', { records });
      toast.success('Davomat saqlandi ✅');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  const counts = Object.values(attendance).reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="animate-in space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('attendance')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('attendance_subtitle', 'O\'quvchilarning kunlik darslardagi ishtirokini belgilash')}
          </p>
        </div>
        {selectedCourse && students.length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-14 px-8 shadow-indigo-500/20 shadow-xl">
            {saving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2" /> : <Save size={20} className="mr-2" />}
            {t('save')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-2 rounded-3xl border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex items-center gap-4 px-6 py-4 flex-1 w-full group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600">
              <BookOpen size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('group')}</p>
              <select 
                className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
              >
                <option value="">{t('select_group')}</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-4 px-6 py-4 w-full md:w-80 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('date')}</p>
              <input 
                className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full cursor-pointer"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-800" />
          <div className="px-6 py-2">
            <Button 
              variant="ghost" 
              className="rounded-xl h-12 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 cursor-pointer"
              onClick={() => {
                const course = courses.find(c => c._id === selectedCourse);
                exportToCSV(students, attendance, selectedDate, course?.title || 'Barchasi');
              }}
            >
              <Download size={18} className="mr-2" /> Excel Yuklash
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      {selectedCourse && students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(STATUS_CONFIG) as AttStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <Card key={status} className={cn("border-none shadow-md overflow-hidden relative group hover:scale-[1.02] transition-all")}>
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5")} style={{ background: cfg.color }} />
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", cfg.bg)}>
                    <Icon size={22} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t(`status_${status}`, cfg.key)}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{counts[status] || 0}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!selectedCourse ? (
        <div className="py-24 text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar size={48} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_group_selected', 'Guruh tanlanmagan')}</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            {t('select_group_to_start', 'Davomatni belgilash uchun yuqoridan guruh va sanani tanlang')}
          </p>
        </div>
      ) : loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={48} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('no_students', 'Talabalar yo\'q')}</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            {t('no_active_students_in_group', 'Ushbu guruhda hali faol talabalar mavjud emas')}
          </p>
        </div>
      ) : (
        <Card className="border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6 flex items-center justify-between">
            <h3 className="text-lg font-black flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              {courses.find(c => c._id === selectedCourse)?.title}
            </h3>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="rounded-xl border-slate-200 py-1 px-4 font-bold text-slate-500">
                {new Date(selectedDate).toLocaleDateString(i18n.language === 'uz' ? 'uz-UZ' : 'en-US', { day: 'numeric', month: 'long' })}
              </Badge>
              <Badge className="bg-slate-900 rounded-xl py-1 px-4 font-bold">
                {students.length} {t('student')}
              </Badge>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((s, i) => {
              const status = attendance[s._id] || 'present';
              return (
                <div key={s._id} className="flex flex-col lg:flex-row lg:items-center justify-between px-8 py-6 gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <div className="flex items-center gap-5 min-w-[280px]">
                    <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-black text-sm border border-white dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105">
                      {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-base leading-tight mb-1">{s.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="text-indigo-500">PHN</span> {s.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_CONFIG) as AttStatus[]).map(st => {
                      const c = STATUS_CONFIG[st];
                      const Icon = c.icon;
                      const isSelected = status === st;
                      return (
                        <button 
                          key={st} 
                          onClick={() => setStatus(s._id, st)}
                          className={cn(
                            "flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black transition-all border outline-none active:scale-95",
                            isSelected 
                              ? "shadow-md scale-105" 
                              : "border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                          style={{
                            borderColor: isSelected ? c.color : undefined,
                            background: isSelected ? c.bg : undefined,
                            color: isSelected ? c.color : undefined,
                          }}
                        >
                          <Icon size={16} />
                          <span className="uppercase tracking-widest">{t(`status_${st}`, c.key)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
