import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Building2, 
  BarChart3, 
  TrendingUp,
  LayoutDashboard,
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
      icon: <FileText className="w-8 h-8" />,
      path: "/waybills",
      primary: false,
      color: "from-blue-600 to-blue-800"
    },
    {
      title: "ორგანიზაციები",
      description: "ორგანიზაციების ინფორმაცია TIN-ით",
      icon: <Building2 className="w-8 h-8" />,
      path: "/organizations",
      primary: false,
      color: "from-indigo-600 to-indigo-800"
    },
    {
      title: "Excel დამუშავება",
      description: "ბულკ მონაცემების დამუშავება",
      icon: <BarChart3 className="w-8 h-8" />,
      path: "/batch",
      primary: false,
      color: "from-slate-700 to-slate-800"
    },
    {
      title: "ანგარიშები",
      description: "ანალიტიკური ანგარიშები",
      icon: <TrendingUp className="w-8 h-8" />,
      path: "#",
      primary: false,
      disabled: true,
      color: "from-slate-700 to-slate-800"
    },
    {
      title: "დებიტორე კრედიტორები",
      description: "დავალიანებების მართვა და კონტროლი",
      icon: <Users className="w-8 h-8" />,
      path: "/debtors",
      primary: false,
      color: "from-slate-700 to-slate-800"
    }
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((mod, idx) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`group relative p-8 rounded-3xl border transition-all duration-300 ${
                  mod.primary 
                    ? `bg-gradient-to-br ${mod.color} border-blue-500 shadow-2xl shadow-blue-900/20` 
                    : "bg-slate-900 border-slate-800 shadow-xl"
                }`}
                style={!mod.primary ? {
                  background: undefined,
                  transition: 'background 0.3s, border-color 0.3s'
                } : undefined}
                onMouseEnter={e => { if (!mod.primary) { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #2563eb, #1e40af)'; (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; } }}
                onMouseLeave={e => { if (!mod.primary) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; } }}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                  mod.primary ? "bg-white/20" : "bg-blue-600/10 text-blue-400"
                }`}>
                  {mod.icon}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${mod.primary ? "text-white" : "text-slate-100"}`}>
                  {mod.title}
                </h3>
                <p className={`text-sm mb-8 leading-relaxed ${mod.primary ? "text-blue-100" : "text-slate-400"}`}>
                  {mod.description}
                </p>
                
                <button
                  onClick={() => !mod.disabled && navigate(mod.path)}
                  disabled={mod.disabled}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${
                    mod.primary
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : mod.disabled
                        ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                >
                  {mod.disabled ? "მალე" : "გადასვლა"}
                  {!mod.disabled && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl"
            >
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">კომპანიის ინფორმაცია</h4>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">დასახელება</label>
                  <p className="text-sm font-bold text-slate-200">შპს 333</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">საიდენტ. ნომერი</label>
                  <p className="text-sm font-mono font-bold text-slate-200">400248683</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">სტატუსი</label>
                  <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                    აქტიური
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl"
            >
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">სტატისტიკა</h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">ამ თვეში:</span>
                  <span className="text-sm font-bold text-white">52 ზედნადები</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">სულ თანხა:</span>
                  <span className="text-sm font-bold text-blue-400">9,504₾</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
