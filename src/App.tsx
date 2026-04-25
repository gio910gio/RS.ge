import React, { useState } from "react";
import { 
  LayoutDashboard, 
  LogOut, 
  Loader2, 
  XCircle, 
  User,
  Hash,
  BarChart3,
  Sun,
  Moon
} from "lucide-react";
import { motion } from "motion/react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Waybills from "./components/Waybills";
import Organizations from "./components/Organizations";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import ChatWidget from "./components/ChatWidget";
import { useTheme } from "./hooks/useTheme";

// --- Components ---

function Header({ su, theme, toggleTheme, onLogout }: { su: string; theme: string, toggleTheme: () => void, onLogout: () => void }) {
  return (
    <header className="h-16 bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)] sticky top-0 z-40 px-6 flex items-center justify-between shadow-md">
      <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-none tracking-tight">MYRS.GE</h1>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title={theme === 'light' ? 'ბნელი თემა' : 'ნათელი თემა'}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <div className="w-px h-6 bg-white/20 mx-2" />
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium text-sm border border-white/10"
        >
          <LogOut className="w-4 h-4" />
          <span>გამოსვლა</span>
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
  const { theme, toggleTheme } = useTheme();

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-page)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-10 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)]"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-[var(--bg-header-from)] to-[var(--bg-header-to)] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">MYRS.GE</h1>
            <p className="text-[var(--text-secondary)] text-sm text-center">ავტორიზაცია სერვისების მართვის მონაცემებით</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">მომხმარებელი</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  value={su}
                  onChange={(e) => setSu(e.target.value)}
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl py-3.5 pl-12 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-[var(--text-muted)]"
                  placeholder="su_XXXXXX"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">პაროლი</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input 
                  type="password" 
                  value={sp}
                  onChange={(e) => setSp(e.target.value)}
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl py-3.5 pl-12 pr-4 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-[var(--text-muted)]"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium"
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "შესვლა"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border-default)] flex justify-center">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-2 px-4 rounded-full border border-[var(--border-default)] hover:border-[var(--border-strong)]"
            >
              {theme === "light" ? <><Moon className="w-3.5 h-3.5" /> ბნელი თემა</> : <><Sun className="w-3.5 h-3.5" /> ნათელი თემა</>}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col">
        <Header su={su} theme={theme} toggleTheme={toggleTheme} onLogout={() => setIsLoggedIn(false)} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar su={su} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<Dashboard su={su} />} />
              <Route path="/waybills" element={<Waybills su={su} sp={sp} />} />
              <Route path="/organizations" element={<Organizations su={su} sp={sp} />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
        
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}
