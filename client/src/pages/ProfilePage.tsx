import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setUser } from '../store/slices/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  Save, Shield, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function ProfilePage() {

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await api.put('/auth/me', profileForm);
      // Update redux store and localStorage with new user data + fresh token
      const updatedUser = data.data;
      dispatch(setUser(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (updatedUser.token) {
        localStorage.setItem('token', updatedUser.token);
      }
      toast.success('Profil muvaffaqiyatli yangilandi ✅');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Yangi parollar mos kelmadi');
      return;
    }
    if (passForm.newPassword.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    setPassLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Parol muvaffaqiyatli o\'zgartirildi ✅');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Parol o\'zgartirishda xato');
    } finally {
      setPassLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  return (
    <div className="animate-in space-y-8 pb-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-6" data-aos="fade-down">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-indigo-500/30">
          {initials}
        </div>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
            {user?.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">
              {user?.role}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info Form */}
      <Card className="border-none shadow-2xl overflow-hidden" data-aos="fade-up">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <User size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Shaxsiy ma'lumotlar</CardTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Ism, Email (login) va telefon raqam
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleProfileSave} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                To'liq ism *
              </label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  placeholder="Ism Familiya"
                  className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Email (Login) *
              </label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  placeholder="email@example.com"
                  className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                />
              </div>
              <p className="text-[10px] text-amber-500 font-bold ml-1 flex items-center gap-1">
                ⚠️ Emailni o'zgartirish login ma'lumotlarini ham o'zgartiradi
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Telefon raqam
              </label>
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+998 90 000 00 00"
                  className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={profileLoading}
              className="w-full h-14 rounded-2xl font-black text-base bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {profileLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Saqlash
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Form */}
      <Card className="border-none shadow-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="100">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Shield size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Parolni o'zgartirish</CardTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Xavfsizlik uchun kuchli parol tanlang
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Joriy parol *
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                  placeholder="Hozirgi parolingiz"
                  className="pl-12 pr-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Yangi parol *
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={passForm.newPassword}
                  onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                  required
                  placeholder="Kamida 6 ta belgi"
                  className="pl-12 pr-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Password strength bar */}
              {passForm.newPassword && (
                <div className="flex gap-1 mt-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      i < (passForm.newPassword.length < 6 ? 1 : passForm.newPassword.length < 9 ? 2 : passForm.newPassword.length < 12 ? 3 : 4)
                        ? i < 1 ? 'bg-red-400' : i < 2 ? 'bg-amber-400' : i < 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Yangi parolni tasdiqlang *
              </label>
              <div className="relative group">
                <CheckCircle size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                  passForm.confirmPassword && passForm.newPassword === passForm.confirmPassword
                    ? 'text-emerald-500'
                    : 'text-slate-400 group-focus-within:text-red-500'
                }`} />
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={passForm.confirmPassword}
                  onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                  required
                  placeholder="Parolni qayta kiriting"
                  className={`pl-12 pr-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-red-500/10 font-bold transition-all ${
                    passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword
                      ? 'border-red-300 focus:ring-red-500/20' : ''
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                <p className="text-[10px] text-red-500 font-bold ml-1">⚠️ Parollar mos kelmadi</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={passLoading}
              className="w-full h-14 rounded-2xl font-black text-base bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {passLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
              ) : (
                <>
                  <Shield size={18} className="mr-2" />
                  Parolni o'zgartirish
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
