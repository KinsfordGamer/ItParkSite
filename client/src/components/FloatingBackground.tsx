import React, { useMemo } from 'react';
import { 
  GraduationCap, BookOpen, Users, CreditCard, 
  Star, Bell, LayoutDashboard, CalendarCheck,
  TrendingUp, Wallet, Award, Book,
  Brain, Rocket, Target, Zap, Globe, Shield,
  Coffee, Briefcase, PieChart, LineChart, Laptop,
  Lightbulb, CheckCircle, Flame
} from 'lucide-react';

const iconsList = [
  GraduationCap, BookOpen, Users, CreditCard, 
  Star, Bell, LayoutDashboard, CalendarCheck,
  TrendingUp, Wallet, Award, Book, Brain, 
  Rocket, Target, Zap, Globe, Shield, Coffee,
  Briefcase, PieChart, LineChart, Laptop,
  Lightbulb, CheckCircle, Flame
];

const FloatingBackground: React.FC = () => {
  const generatedIcons = useMemo(() => {
    return Array.from({ length: 50 }).map((_) => ({
      Icon: iconsList[Math.floor(Math.random() * iconsList.length)],
      size: Math.floor(Math.random() * 25) + 20, // 20px to 45px
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${Math.floor(Math.random() * 20) + 20}s`,
      delay: `${Math.floor(Math.random() * 10)}s`,
      opacity: Math.random() * 0.15 + 0.1, // 0.1 to 0.25 opacity
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30px, -50px) rotate(120deg); }
            66% { transform: translate(-20px, 20px) rotate(240deg); }
            100% { transform: translate(0, 0) rotate(360deg); }
          }
          .floating-icon {
            animation: float infinite linear;
          }
        `}
      </style>
      {generatedIcons.map((item, i) => (
        <div
          key={i}
          className="absolute floating-icon text-indigo-500 dark:text-indigo-400"
          style={{
            left: item.left,
            top: item.top,
            animationDuration: item.duration,
            animationDelay: item.delay,
            opacity: item.opacity,
          }}
        >
          <item.Icon size={item.size} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
};

export default FloatingBackground;
