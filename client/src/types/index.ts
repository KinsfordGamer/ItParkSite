export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'manager' | 'admin' | 'administrator' | 'teacher';
  phone?: string;
  avatar?: string;
  academy?: string;
  isActive: boolean;
  createdAt: string;
  token?: string;
}

export interface Academy {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  owner?: User | string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  trialEndsAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Teacher {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  salary: number;
  salaryPaid: number;
  isActive: boolean;
  joinDate: string;
  avatar?: string;
  courses?: Course[];
  createdAt: string;
}

export interface Course {
  _id: string;
  title: string;
  description?: string;
  price: number;
  duration?: string;
  teacher?: Teacher;
  schedule?: string;
  startDate?: string;
  maxStudents: number;
  isActive: boolean;
  color: string;
  studentCount?: number;
  createdAt: string;
}

export interface Student {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  course?: Course;
  teacher?: Teacher;
  status: 'active' | 'inactive' | 'graduated' | 'pending';
  balance: number;
  totalPaid: number;
  joinDate: string;
  avatar?: string;
  address?: string;
  birthDate?: string;
  parentPhone?: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  student: Student | string;
  course?: Course | string;
  amount: number;
  type: 'cash' | 'card' | 'transfer';
  note?: string;
  date: string;
  receivedBy?: User | string;
  month?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  _id: string;
  student: Student | string;
  course: Course | string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  markedBy?: User | string;
}

export interface Salary {
  _id: string;
  teacher: Teacher | string;
  amount: number;
  type: 'cash' | 'card' | 'transfer';
  note?: string;
  date: string;
  month: string;
  paidBy?: User | string;
  createdAt: string;
}

export interface Grade {
  _id: string;
  student: Student | string;
  course: Course | string;
  teacher: User | string;
  grade: number;
  comment?: string;
  date: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  activeCourses: number;
  totalTeachers: number;
  periodIncome: number;
  periodExpenditure: number;
  totalDebt: number;
  attendanceRate: number;
  incomeChart: { _id: string; income: number }[];
  studentStats: { _id: string; count: number }[];
  recentPayments: Payment[];
  debtors: Student[];
  performanceStats: { _id: string; courseTitle: string; averageGrade: number; count: number }[];
  studentPerformance: { _id: string; name: string; phone: string; course: string; averageGrade: number; count: number }[];
  recentGrades: Grade[];
  allCourses: { _id: string; title: string }[];
  insights: {
    atRiskStudents: Student[];
    pendingSalaries: { _id: string; name: string; amount: number }[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  pages?: number;
}
