import React, { useState } from "react";
import { 
  LayoutDashboard, 
  LogOut, 
  Loader2, 
  XCircle, 
  User,
  Hash,
  Building2,
  FileText
} from "lucide-react";
import { motion } from "motion/react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Waybills from "./components/Waybills";
import Organizations from "./components/Organizations";

// --- Components ---

function Header({ su, onLogout }: { su: string; onLogout: () => void }) {
  const location = useLocation();
  
  return (
    <header className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30 px-8 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none mb-1">RS.GE საძიებო სისტემა</h1>
            <p className="text-xs text-slate-500 font-medium">სისტემის მართვის პანელი</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link 
            to="/waybills"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === "/waybills" 
                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            📋 ზედნადებები
          </Link>
          <Link 
            to="/organizations"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === "/organizations" 
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Building2 className="w-4 h-4" />
            🏢 ორგანიზაციები
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
            {su.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-300">{su}</span>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [su, setSu] = useState("");
  const [sp, setSp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ su, sp })
      });
      const data = await response.json();
      if (response.ok && data.result === "true") {
        setIsLoggedIn(true);
      } else {
        setError(data.error || "ავტორიზაცია ვერ მოხერხდა (არასწორი su/sp)");
      }
    } catch (err) {
      setError("კავშირის შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/50"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">RS.GE საძიებო სისტემა</h1>
            <p className="text-slate-400 text-sm text-center">ავტორიზაცია სერვისების მართვის მონაცემებით</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">su (მომხმარებელი)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={su}
                  onChange={(e) => setSu(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="su"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">sp (პაროლი)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  value={sp}
                  onChange={(e) => setSp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="sp"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm"
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "შესვლა"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col">
        <Header su={su} onLogout={() => setIsLoggedIn(false)} />
        
        <Routes>
          <Route path="/waybills" element={<Waybills su={su} sp={sp} />} />
          <Route path="/organizations" element={<Organizations su={su} sp={sp} />} />
          <Route path="/" element={<Navigate to="/waybills" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
