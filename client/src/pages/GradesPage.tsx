import { useEffect, useState } from 'react';
import { Save, BookOpen, User, Star } from 'lucide-react';
import api from '../services/api';
import type { Course, Student } from '../types';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useTranslation } from 'react-i18next';

export default function GradesPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [grades, setGrades] = useState<Record<string, { grade: string, comment: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.data));
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    api.get('/students', { params: { course: selectedCourse, status: 'active', limit: 200 } })
      .then(({ data }) => {
        setStudents(data.data);
        const initial: Record<string, { grade: string, comment: string }> = {};
        data.data.forEach((s: Student) => {
          initial[s._id] = { grade: '', comment: '' };
        });
        setGrades(initial);
      });
  }, [selectedCourse]);

  const handleSave = async (studentId: string) => {
    const data = grades[studentId];
    if (!data.grade) {
      toast.error('Baho kiriting');
      return;
    }

    setSaving(true);
    try {
      await api.post('/grades', {
        student: studentId,
        course: selectedCourse,
        grade: Number(data.grade),
        comment: data.comment,
      });
      toast.success('Baho saqlandi 🎉');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-tight">
            {t('grading', 'Baholash')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('grading_subtitle', 'O\'quvchilar bilimini baholash va natijalarni qayd etish')}
          </p>
        </div>
      </div>

      <Card className="p-2 rounded-3xl border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-3 px-6 py-4 group">
          <BookOpen size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <select 
            className="bg-transparent border-none outline-none text-sm font-black text-slate-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
          >
            <option value="">Kursni tanlang</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </div>
      </Card>

      {!selectedCourse ? (
        <div className="py-24 text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star size={48} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Kurs tanlanmagan</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            Baholashni boshlash uchun yuqoridagi ro'yxatdan kursni tanlang
          </p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={48} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Talabalar yo'q</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            Ushbu kursda hali faol talabalar mavjud emas
          </p>
        </div>
      ) : (
        <Card className="border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
             <h3 className="text-lg font-black flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              {courses.find(c => c._id === selectedCourse)?.title}
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((s, i) => (
              <div key={s._id} className="flex flex-col lg:flex-row lg:items-center justify-between px-8 py-6 gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-center gap-5 min-w-[280px]">
                  <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-black text-sm border border-white dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105">
                    {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-base leading-tight mb-1">{s.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.phone}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-32">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Baho (0-100)</label>
                    <Input 
                      type="number" 
                      placeholder="85"
                      className="rounded-xl h-11 font-black text-center"
                      value={grades[s._id]?.grade || ''}
                      onChange={e => setGrades({ ...grades, [s._id]: { ...grades[s._id], grade: e.target.value } })}
                    />
                  </div>
                  <div className="w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Izoh</label>
                    <Input 
                      placeholder="Natija haqida qisqacha..."
                      className="rounded-xl h-11"
                      value={grades[s._id]?.comment || ''}
                      onChange={e => setGrades({ ...grades, [s._id]: { ...grades[s._id], comment: e.target.value } })}
                    />
                  </div>
                  <div className="pt-5">
                    <Button 
                      onClick={() => handleSave(s._id)} 
                      disabled={saving}
                      className="rounded-xl h-11 w-11 p-0 shadow-lg shadow-indigo-500/20"
                    >
                      <Save size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
