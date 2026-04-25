import React from "react";
import { 
  Settings, 
  AlignJustify, 
  HelpCircle, 
  FileText,
  User,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

interface SidebarProps {
  su: string;
}

const Sidebar: React.FC<SidebarProps> = ({ su }) => {
  const avatarText = su ? su.slice(0, 2).toUpperCase() : "US";

  return (
    <aside className="w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] flex flex-col h-full overflow-y-auto sticky top-0 hidden lg:flex">
      {/* User Card */}
      <div className="p-6 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {avatarText}
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] leading-tight">{su}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">აქტიური სესია</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Company Info */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">კომპანიის ინფო</h4>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium mb-0.5">დასახელება</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">შპს 333</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium mb-0.5">საიდენტ. ნომერი</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">400248683</p>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded">აქტიური</span>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">სტატისტიკა</h4>
          </div>
          <div className="p-4 bg-[var(--bg-surface-2)] rounded-xl border border-[var(--border-default)]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[var(--text-secondary)]">ამ თვეში:</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">52 ზედნადები</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-secondary)]">სულ თანხა:</span>
              <span className="text-xs font-bold text-blue-600">9,504₾</span>
            </div>
          </div>
        </section>

        {/* Extra Navigation */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[var(--text-muted)]" />
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">სხვა</h4>
          </div>
          <nav className="space-y-1">
            {[
              { label: "პირადი მონაცემები", icon: Settings },
              { label: "აქტივობის რეესტრი", icon: AlignJustify },
              { label: "მხარდაჭერა", icon: HelpCircle },
              { label: "დოკუმენტაცია", icon: FileText }
            ].map((item, idx) => (
              <button 
                key={idx}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] transition-colors text-left"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </section>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-[var(--border-default)]">
        <p className="text-[10px] text-[var(--text-muted)] font-medium">MYRS.GE v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
