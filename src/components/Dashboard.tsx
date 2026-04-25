import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Building2, 
  BarChart3, 
  TrendingUp,
  ArrowRight,
  Users
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  su: string;
}

export default function Dashboard({ su }: DashboardProps) {
  const navigate = useNavigate();

  const modules = [
    {
      title: "ზედნადებები",
      description: "ზედნადებების ძიება და მართვა",
      icon: <FileText className="w-6 h-6" />,
      path: "/waybills",
      accent: "#8B5CF6", // Purple
      rgba: "rgba(139, 92, 246, 0.12)"
    },
    {
      title: "ორგანიზაციები",
      description: "ორგანიზაციების ინფორმაცია TIN-ით",
      icon: <Building2 className="w-6 h-6" />,
      path: "/organizations",
      accent: "#3B82F6", // Blue
      rgba: "rgba(59, 130, 246, 0.12)"
    },
    {
      title: "Excel დამუშავება",
      description: "ბულკ მონაცემების დამუშავება",
      icon: <BarChart3 className="w-6 h-6" />,
      path: "/batch",
      accent: "#10B981", // Green
      rgba: "rgba(16, 185, 129, 0.12)"
    },
    {
      title: "ანგარიშები",
      description: "ანალიტიკური ანგარიშები",
      icon: <TrendingUp className="w-6 h-6" />,
      path: "#",
      disabled: true,
      accent: "#F59E0B", // Orange
      rgba: "rgba(245, 158, 11, 0.12)"
    },
    {
      title: "დებიტორე კრედიტორები",
      description: "დავალიანებების მართვა და კონტროლი",
      icon: <Users className="w-6 h-6" />,
      path: "/debtors",
      accent: "#EF4444", // Red
      rgba: "rgba(239, 68, 68, 0.12)"
    }
  ];

  return (
    <div className="min-h-full bg-[var(--bg-page)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">მთავარი</h2>
          <p className="text-[var(--text-secondary)] text-sm">აირჩიეთ მოდული მუშაობის დასაწყებად</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, idx) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 relative overflow-hidden flex flex-col p-8 group"
            >
              {/* Bottom Accent Bar */}
              <div 
                className="absolute bottom-0 left-0 w-full h-1" 
                style={{ backgroundColor: mod.accent }}
              ></div>
              
              <div className="flex-1">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: mod.rgba, color: mod.accent }}
                >
                  {mod.icon}
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                  {mod.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              
              <button
                onClick={() => !mod.disabled && navigate(mod.path)}
                disabled={mod.disabled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all border ${
                  mod.disabled
                    ? "bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-default)] cursor-not-allowed"
                    : "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-transparent group-hover:text-white"
                }`}
                style={!mod.disabled ? {
                  '--hover-bg': mod.accent
                } as React.CSSProperties : {}}
                onMouseEnter={e => {
                  if (!mod.disabled) {
                    e.currentTarget.style.backgroundColor = mod.accent;
                  }
                }}
                onMouseLeave={e => {
                  if (!mod.disabled) {
                    e.currentTarget.style.backgroundColor = '';
                  }
                }}
              >
                {mod.disabled ? "მალე" : "გადასვლა"}
                {!mod.disabled && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
