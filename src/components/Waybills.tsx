import React, { useState, useEffect } from "react";
import { 
  Search, 
  ArrowRightLeft, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Filter, 
  Loader2, 
  XCircle, 
  Info,
  Building2,
  Truck,
  User,
  MapPin,
  Hash,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

interface Waybill {
  ID: number;
  SELLER_NAME: string;
  SELLER_TIN: string;
  TYPE: number;
  CREATE_DATE: string;
  BUYER_TIN: string;
  BUYER_NAME: string;
  START_ADDRESS: string;
  END_ADDRESS: string;
  DRIVER_TIN: string;
  DRIVER_NAME: string;
  TRANSPORT_COAST: number;
  STATUS: number;
  ACTIVATE_DATE: string;
  FULL_AMOUNT: number;
  WAYBILL_NUMBER: string;
  CAR_NUMBER: string;
  STATUS_NAME: string;
}

interface WaybillDetail {
  waybill: any;
  goods: any[];
}

interface WaybillsProps {
  su: string;
  sp: string;
}

export default function Waybills({ su, sp }: WaybillsProps) {
  const [loading, setLoading] = useState(false);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentTab, setCurrentTab] = useState("tab_given");
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState({
    day: String(thirtyDaysAgo.getDate()).padStart(2, '0'),
    month: String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0'),
    year: String(thirtyDaysAgo.getFullYear())
  });

  const [endDate, setEndDate] = useState({
    day: String(today.getDate()).padStart(2, '0'),
    month: String(today.getMonth() + 1).padStart(2, '0'),
    year: String(today.getFullYear())
  });

  const [filterText, setFilterText] = useState("");
  
  const [filters, setFilters] = useState({
    status: '',
    carNumber: '',
    organization: '',
    waybillNumber: '',
    tin: '',
    amount: ''
  });

  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [waybillDetail, setWaybillDetail] = useState<WaybillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Handlers ---

  const fetchWaybills = async (page: number = 0, tabOverride?: string) => {
    setLoading(true);
    const activeTab = tabOverride ?? currentTab;
    try {
      let type = 0;
      if (activeTab === "tab_given") type = 1;
      if (activeTab === "tab_received") type = 2;
      if (activeTab === "tab_all") type = 0;

      const startStr = `${startDate.year}-${startDate.month}-${startDate.day}`;
      const endStr = `${endDate.year}-${endDate.month}-${endDate.day}`;

      const response = await fetch("/api/waybills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          su, 
          sp, 
          type, 
          startDate: startStr, 
          endDate: endStr, 
          statuses: filters.status,
          carNumber: filters.carNumber,
          waybillNumber: filters.waybillNumber,
          filterExpression: filterText,
          startRowIndex: page * 300 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setWaybills(data.rows || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (waybill: Waybill) => {
    setSelectedWaybill(waybill);
    setDetailLoading(true);
    setWaybillDetail(null);
    try {
      const response = await fetch("/api/waybill/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ su, sp, waybillId: waybill.ID })
      });
      const data = await response.json();
      if (response.ok) {
        setWaybillDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchWaybills(0);
  }, []);

  const filteredWaybills = waybills.filter(wb => {
    // Organization filter (Frontend) - checks both BUYER and SELLER
    if (filters.organization && 
      !(wb.BUYER_NAME || "").toLowerCase().includes(filters.organization.toLowerCase()) &&
      !(wb.SELLER_NAME || "").toLowerCase().includes(filters.organization.toLowerCase())) {
      return false;
    }
    
    // TIN filter (Frontend) - checks both BUYER and SELLER
    if (filters.tin && 
      !(wb.BUYER_TIN || "").toLowerCase().includes(filters.tin.toLowerCase()) &&
      !(wb.SELLER_TIN || "").toLowerCase().includes(filters.tin.toLowerCase())) {
      return false;
    }

    // Waybill Number filter (Frontend - in case backend filter is not enough or for instant feedback)
    if (filters.waybillNumber && !(wb.WAYBILL_NUMBER || String(wb.ID)).toLowerCase().includes(filters.waybillNumber.toLowerCase())) {
      return false;
    }

    // Car Number filter (Frontend)
    if (filters.carNumber && filters.carNumber !== "" && !(wb.CAR_NUMBER || "").toLowerCase().includes(filters.carNumber.toLowerCase())) {
      return false;
    }

    // Status filter (Frontend)
    if (filters.status && String(wb.STATUS) !== filters.status) {
      return false;
    }
    
    // Amount filter (Frontend)
    if (filters.amount) {
      const amount = Number(wb.FULL_AMOUNT || 0);
      if (amount < Number(filters.amount)) return false;
    }

    return true;
  });

  const calculateTotal = () => {
    return filteredWaybills.reduce((sum, item) => {
      return sum + parseFloat(String(item.FULL_AMOUNT || 0));
    }, 0).toFixed(2);
  };

  const totalPages = Math.ceil(filteredWaybills.length / itemsPerPage);
  const paginatedWaybills = filteredWaybills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: any) => {
    const s = String(status || "");
    if (s === "1") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    if (s === "2") return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    if (s === "-2") return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

  const getStatusText = (status: any) => {
    const s = String(status || "");
    if (s === "1") return "აქტიური";
    if (s === "2") return "დასრულებული";
    if (s === "-2") return "გაუქმებული";
    return "უცნობი";
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedWaybill(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--bg-page)]">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Tabs & Filters */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div 
              className="flex p-1 rounded-xl border"
              style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              {[
                { id: "tab_given", label: "გაცემული", icon: ArrowRightLeft },
                { id: "tab_received", label: "მიღებული", icon: FileText },
                { id: "tab_all", label: "ყველა", icon: Filter }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id);
                    setCurrentPage(1);
                    fetchWaybills(0, tab.id);
                  }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    currentTab === tab.id 
                      ? "text-white shadow-lg" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                  }`}
                  style={currentTab === tab.id ? {
                    background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))",
                    boxShadow: "0 4px 12px rgba(30, 136, 229, 0.25)"
                  } : {}}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* თარიღის დიაპაზონი */}
              <div 
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border"
                style={{ 
                  backgroundColor: "var(--bg-surface)", 
                  borderColor: "var(--border-default)",
                  boxShadow: "var(--shadow-card)"
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">თარიღიდან:</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={startDate.day} 
                      onChange={(e) => setStartDate({...startDate, day: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      {Array.from({length: 31}, (_, i) => {
                        const d = String(i + 1).padStart(2, '0');
                        return <option key={d} value={d}>{d}</option>
                      })}
                    </select>
                    <select 
                      value={startDate.month} 
                      onChange={(e) => setStartDate({...startDate, month: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      <option value="01">იანვარი</option>
                      <option value="02">თებერვალი</option>
                      <option value="03">მარტი</option>
                      <option value="04">აპრილი</option>
                      <option value="05">მაისი</option>
                      <option value="06">ივნისი</option>
                      <option value="07">ივლისი</option>
                      <option value="08">აგვისტო</option>
                      <option value="09">სექტემბერი</option>
                      <option value="10">ოქტომბერი</option>
                      <option value="11">ნოემბერი</option>
                      <option value="12">დეკემბერი</option>
                    </select>
                    <select 
                      value={startDate.year} 
                      onChange={(e) => setStartDate({...startDate, year: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      {Array.from({length: 10}, (_, i) => {
                        const year = String(new Date().getFullYear() - i);
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="w-px h-8 hidden sm:block mx-2" style={{ backgroundColor: "var(--border-default)" }} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">თარიღამდე:</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={endDate.day} 
                      onChange={(e) => setEndDate({...endDate, day: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      {Array.from({length: 31}, (_, i) => {
                        const d = String(i + 1).padStart(2, '0');
                        return <option key={d} value={d}>{d}</option>
                      })}
                    </select>
                    <select 
                      value={endDate.month} 
                      onChange={(e) => setEndDate({...endDate, month: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      <option value="01">იანვარი</option>
                      <option value="02">თებერვალი</option>
                      <option value="03">მარტი</option>
                      <option value="04">აპრილი</option>
                      <option value="05">მაისი</option>
                      <option value="06">ივნისი</option>
                      <option value="07">ივლისი</option>
                      <option value="08">აგვისტო</option>
                      <option value="09">სექტემბერი</option>
                      <option value="10">ოქტომბერი</option>
                      <option value="11">ნოემბერი</option>
                      <option value="12">დეკემბერი</option>
                    </select>
                    <select 
                      value={endDate.year} 
                      onChange={(e) => setEndDate({...endDate, year: e.target.value})}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ 
                        backgroundColor: "var(--bg-surface-2)", 
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)"
                      }}
                    >
                      {Array.from({length: 10}, (_, i) => {
                        const year = String(new Date().getFullYear() - i);
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex items-end pb-0.5">
                  <button 
                    onClick={() => fetchWaybills(0)}
                    className="flex items-center gap-2 px-5 py-2 text-white text-xs font-bold rounded-lg transition-all hover:opacity-90 shadow-lg shadow-blue-500/20"
                    style={{ background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))" }}
                  >
                    <Search className="w-3.5 h-3.5" />
                    ძებნა
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div 
            className="rounded-2xl overflow-hidden border"
            style={{ 
              backgroundColor: "var(--bg-surface)", 
              borderColor: "var(--border-default)",
              boxShadow: "var(--shadow-card)"
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr 
                    className="border-b"
                    style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                  >
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">ნომერი</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">ორგანიზაცია</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">TIN</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">თანხა</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">მანქანა</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">სტატუსი</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">თარიღი</th>
                  </tr>
                  <tr 
                    className="border-b"
                    style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
                  >
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="ნომერი..."
                        value={filters.waybillNumber}
                        onChange={(e) => setFilters({...filters, waybillNumber: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="ორგანიზაცია..."
                        value={filters.organization}
                        onChange={(e) => setFilters({...filters, organization: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="TIN..."
                        value={filters.tin}
                        onChange={(e) => setFilters({...filters, tin: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        placeholder="თანხა..."
                        value={filters.amount}
                        onChange={(e) => setFilters({...filters, amount: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="მანქანა..."
                        value={filters.carNumber}
                        onChange={(e) => setFilters({...filters, carNumber: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                      >
                        <option value="">ყველა</option>
                        <option value="1">აქტიური</option>
                        <option value="2">დასრულებული</option>
                        <option value="-2">გაუქმებული</option>
                      </select>
                    </td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-8">
                          <div className="h-4 rounded w-full" style={{ backgroundColor: "var(--bg-surface-2)" }}></div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedWaybills.length > 0 ? (
                    paginatedWaybills.map((wb, index) => (
                      <tr 
                        key={wb.ID} 
                        onClick={() => fetchDetail(wb)}
                        className="cursor-pointer transition-colors"
                        style={{ 
                          backgroundColor: selectedWaybill?.ID === wb.ID ? "rgba(37, 99, 235, 0.05)" : (index % 2 === 0 ? "transparent" : "var(--bg-surface-2)"),
                          color: "var(--text-primary)"
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--nav-hover-bg)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedWaybill?.ID === wb.ID ? "rgba(37, 99, 235, 0.05)" : (index % 2 === 0 ? "transparent" : "var(--bg-surface-2)")}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: "rgba(37, 99, 235, 0.1)", color: "var(--bg-header-from)" }}
                            >
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">{wb.WAYBILL_NUMBER || wb.ID}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm block max-w-[200px] truncate" style={{ color: "var(--text-primary)" }}>{wb.BUYER_NAME}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{wb.BUYER_TIN}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold">{Number(wb.FULL_AMOUNT || 0).toFixed(2)} ₾</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{wb.CAR_NUMBER || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(wb.STATUS)}`}>
                            {getStatusText(wb.STATUS)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{wb.CREATE_DATE}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Info className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
                          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>ჩანაწერები ვერ მოიძებნა</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredWaybills.length > 0 && (
                  <tfoot>
                    <tr 
                      className="border-t-2 font-bold"
                      style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "rgba(37, 99, 235, 0.3)" }}
                    >
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-right uppercase text-[10px] tracking-wider" style={{ color: "var(--text-secondary)" }}>სულ:</td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-black text-blue-500">{calculateTotal()} ₾</span>
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div 
            className="rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border"
            style={{ 
              backgroundColor: "var(--bg-surface)", 
              borderColor: "var(--border-default)",
              boxShadow: "var(--shadow-card)"
            }}
          >
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>ნაჩვენები</span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                <ChevronLeft className="w-4 h-4" />
                წინა
              </button>
              
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="text-blue-500">{currentPage}</span>
                <span style={{ color: "var(--text-muted)" }}>/</span>
                <span style={{ color: "var(--text-secondary)" }}>{totalPages || 1}</span>
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              >
                შემდეგი
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              სულ: <span className="font-bold" style={{ color: "var(--text-primary)" }}>{filteredWaybills.length}</span> ზედნადები
            </div>
          </div>
        </div>
      </main>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedWaybill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWaybill(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border"
              style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
            >
              {/* Header */}
              <div 
                className="p-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-10"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}
                  >
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl leading-none mb-1" style={{ color: "var(--text-primary)" }}>
                      ზედნადები #{selectedWaybill.WAYBILL_NUMBER || selectedWaybill.ID} | ID-{selectedWaybill.ID}
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>დეტალური ინფორმაცია</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWaybill(null)}
                  className="p-2 rounded-xl transition-all hover:opacity-70"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>იტვირთება მონაცემები...</p>
                  </div>
                ) : waybillDetail ? (
                  <>
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Seller */}
                      <div 
                        className="p-6 rounded-3xl border"
                        style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-500" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>გამყიდველი</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.SELLER_NAME}</p>
                          <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>TIN: {waybillDetail.waybill.SELLER_TIN}</p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{waybillDetail.waybill.START_ADDRESS}</p>
                        </div>
                      </div>

                      {/* Buyer */}
                      <div 
                        className="p-6 rounded-3xl border"
                        style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <User className="w-5 h-5 text-indigo-500" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>მყიდველი</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.BUYER_NAME}</p>
                          <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>TIN: {waybillDetail.waybill.BUYER_TIN}</p>
                        </div>
                      </div>

                      {/* Logistics & Transport */}
                      <div 
                        className="p-6 rounded-3xl border md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8"
                        style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                      >
                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-rose-500/10 rounded-lg">
                              <MapPin className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>საწყისი მისამართი</span>
                              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.START_ADDRESS}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <MapPin className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                               <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>საბოლოო მისამართი</span>
                              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.END_ADDRESS}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                              <Truck className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                               <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>მძღოლი & მანქანა</span>
                              <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.DRIVER_NAME || "-"}</p>
                              <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>TIN: {waybillDetail.waybill.DRIVER_TIN || "-"}</p>
                              <p 
                                className="text-xs font-mono mt-1 px-2 py-1 rounded inline-block"
                                style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}
                              >
                                {waybillDetail.waybill.CAR_NUMBER || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }}>
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex-1 flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>თარიღი & სტატუსი</span>
                                <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{waybillDetail.waybill.CREATE_DATE}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border mt-4 ${getStatusColor(waybillDetail.waybill.STATUS)}`}>
                                {getStatusText(waybillDetail.waybill.STATUS)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Goods Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                          <Package className="w-5 h-5 text-blue-500" />
                          საქონლის სია
                        </h3>
                        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{waybillDetail.goods.length} დასახელება</span>
                      </div>
                      <div 
                        className="rounded-3xl border overflow-hidden shadow-inner"
                        style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                      >
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr 
                              className="border-b"
                              style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
                            >
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider w-12" style={{ color: "var(--text-secondary)" }}>#</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დასახელება</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: "var(--text-secondary)" }}>ერთეული</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>რაოდ.</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>ფასი</th>
                              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>თანხა</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "var(--bg-surface)" }}>
                            {waybillDetail.goods.map((item: any, i: number) => (
                              <tr key={i} className="transition-colors hover:bg-[var(--nav-hover-bg)]">
                                <td className="px-6 py-4 text-xs font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                                <td className="px-6 py-4">
                                  <p className="text-xs font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{item.W_NAME}</p>
                                </td>
                                <td className="px-6 py-4 text-center text-xs" style={{ color: "var(--text-secondary)" }}>{item.UNIT_NAME}</td>
                                <td className="px-6 py-4 text-right text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{item.QUANTITY}</td>
                                <td className="px-6 py-4 text-right text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{Number(item.PRICE).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold font-mono" style={{ color: "var(--text-primary)" }}>{Number(item.AMOUNT).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Summary */}
                    <div 
                      className="p-8 rounded-3xl border flex flex-col md:flex-row justify-between items-center gap-8"
                      style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}
                    >
                      <div className="flex-1">
                        {waybillDetail.waybill.COMMENT && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">კომენტარი</span>
                            <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>"{waybillDetail.waybill.COMMENT}"</p>
                          </div>
                        )}
                      </div>
                      <div className="text-center md:text-right min-w-[200px]">
                        <span className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: "var(--text-secondary)" }}>სულ გადასახდელი</span>
                        <p className="text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                          {Number(waybillDetail.waybill.FULL_AMOUNT || 0).toFixed(2)} <span className="text-blue-500 text-2xl">₾</span>
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <XCircle className="w-16 h-16" style={{ color: "var(--border-default)" }} />
                    <p className="font-medium" style={{ color: "var(--text-secondary)" }}>მონაცემები ვერ ჩაიტვირთა</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
