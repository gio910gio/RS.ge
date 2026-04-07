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
  const [itemsPerPage, setItemsPerPage] = useState(25);
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

  const fetchWaybills = async (page: number = 0) => {
    setLoading(true);
    try {
      let type = 0;
      if (currentTab === "tab_given") type = 1;
      if (currentTab === "tab_received") type = 2;

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
  }, [currentTab, startDate.day, startDate.month, startDate.year, endDate.day, endDate.month, endDate.year]);

  const filteredWaybills = waybills.filter(wb => {
    // Organization filter (Frontend)
    if (filters.organization && !(wb.BUYER_NAME || "").toLowerCase().includes(filters.organization.toLowerCase())) {
      return false;
    }
    
    // TIN filter (Frontend)
    if (filters.tin && !(wb.BUYER_TIN || "").toLowerCase().includes(filters.tin.toLowerCase())) {
      return false;
    }

    // Waybill Number filter (Frontend - in case backend filter is not enough or for instant feedback)
    if (filters.waybillNumber && !(wb.WAYBILL_NUMBER || String(wb.ID)).toLowerCase().includes(filters.waybillNumber.toLowerCase())) {
      return false;
    }

    // Car Number filter (Frontend)
    if (filters.carNumber && !(wb.CAR_NUMBER || "").toLowerCase().includes(filters.carNumber.toLowerCase())) {
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
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Tabs & Filters */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
              {[
                { id: "tab_given", label: "გაცემული", icon: ArrowRightLeft },
                { id: "tab_received", label: "მიღებული", icon: FileText },
                { id: "tab_all", label: "ყველა", icon: Filter }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id);
                    setCurrentPage(0);
                  }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    currentTab === tab.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* თარიღის დიაპაზონი */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">თარიღიდან:</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={startDate.day} 
                      onChange={(e) => setStartDate({...startDate, day: e.target.value})}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {Array.from({length: 31}, (_, i) => {
                        const d = String(i + 1).padStart(2, '0');
                        return <option key={d} value={d}>{d}</option>
                      })}
                    </select>
                    <select 
                      value={startDate.month} 
                      onChange={(e) => setStartDate({...startDate, month: e.target.value})}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {Array.from({length: 10}, (_, i) => {
                        const year = String(new Date().getFullYear() - i);
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="w-px h-8 bg-slate-800 hidden sm:block mx-2" />

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">თარიღამდე:</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={endDate.day} 
                      onChange={(e) => setEndDate({...endDate, day: e.target.value})}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {Array.from({length: 31}, (_, i) => {
                        const d = String(i + 1).padStart(2, '0');
                        return <option key={d} value={d}>{d}</option>
                      })}
                    </select>
                    <select 
                      value={endDate.month} 
                      onChange={(e) => setEndDate({...endDate, month: e.target.value})}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {Array.from({length: 10}, (_, i) => {
                        const year = String(new Date().getFullYear() - i);
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ნომერი</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ორგანიზაცია</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">თანხა</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">მანქანა</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">სტატუსი</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">თარიღი</th>
                  </tr>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="ნომერი..."
                        value={filters.waybillNumber}
                        onChange={(e) => setFilters({...filters, waybillNumber: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="ორგანიზაცია..."
                        value={filters.organization}
                        onChange={(e) => setFilters({...filters, organization: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="TIN..."
                        value={filters.tin}
                        onChange={(e) => setFilters({...filters, tin: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        placeholder="თანხა..."
                        value={filters.amount}
                        onChange={(e) => setFilters({...filters, amount: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="მანქანა..."
                        value={filters.carNumber}
                        onChange={(e) => setFilters({...filters, carNumber: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-8">
                          <div className="h-4 bg-slate-800 rounded w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedWaybills.length > 0 ? (
                    paginatedWaybills.map((wb) => (
                      <tr 
                        key={wb.ID} 
                        onClick={() => fetchDetail(wb)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedWaybill?.ID === wb.ID ? "bg-blue-600/5" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-white">{wb.WAYBILL_NUMBER || wb.ID}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300 block max-w-[200px] truncate">{wb.BUYER_NAME}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-500">{wb.BUYER_TIN}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white">{Number(wb.FULL_AMOUNT || 0).toFixed(2)} ₾</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400">{wb.CAR_NUMBER || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(wb.STATUS)}`}>
                            {getStatusText(wb.STATUS)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500">{wb.CREATE_DATE}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Info className="w-12 h-12 text-slate-700" />
                          <p className="text-slate-500 font-medium">ჩანაწერები ვერ მოიძებნა</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredWaybills.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-600/5 border-t-2 border-blue-600/30 font-bold">
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-right text-slate-400 uppercase text-[10px] tracking-wider">სულ:</td>
                      <td className="px-6 py-4">
                        <span className="text-lg text-blue-400 font-black">{calculateTotal()} ₾</span>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-slate-300 transition-all border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                წინა
              </button>
              
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="text-blue-500">{currentPage}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{totalPages || 1}</span>
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-slate-300 transition-all border border-slate-700"
              >
                შემდეგი
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-slate-500">
              სულ: <span className="text-slate-300 font-bold">{filteredWaybills.length}</span> ზედნადები
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
              className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-white leading-none mb-1">
                      ზედნადები #{selectedWaybill.WAYBILL_NUMBER || selectedWaybill.ID} | ID-{selectedWaybill.ID}
                    </h2>
                    <p className="text-xs text-slate-500">დეტალური ინფორმაცია</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWaybill(null)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">იტვირთება მონაცემები...</p>
                  </div>
                ) : waybillDetail ? (
                  <>
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Seller */}
                      <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800/60">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">გამყიდველი</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-bold text-white">{waybillDetail.waybill.SELLER_NAME}</p>
                          <p className="text-sm text-slate-400 font-mono">TIN: {waybillDetail.waybill.SELLER_TIN}</p>
                          <p className="text-sm text-slate-400">{waybillDetail.waybill.START_ADDRESS}</p>
                        </div>
                      </div>

                      {/* Buyer */}
                      <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800/60">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <User className="w-5 h-5 text-indigo-400" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">მყიდველი</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-bold text-white">{waybillDetail.waybill.BUYER_NAME}</p>
                          <p className="text-sm text-slate-400 font-mono">TIN: {waybillDetail.waybill.BUYER_TIN}</p>
                        </div>
                      </div>

                      {/* Logistics & Transport */}
                      <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800/60 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-rose-500/10 rounded-lg">
                              <MapPin className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">საწყისი მისამართი</span>
                              <p className="text-sm text-slate-300 mt-1">{waybillDetail.waybill.START_ADDRESS}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <MapPin className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">საბოლოო მისამართი</span>
                              <p className="text-sm text-slate-300 mt-1">{waybillDetail.waybill.END_ADDRESS}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                              <Truck className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">მძღოლი & მანქანა</span>
                              <p className="text-sm text-slate-300 mt-1">{waybillDetail.waybill.DRIVER_NAME || "-"}</p>
                              <p className="text-xs text-slate-500 font-mono mt-1">TIN: {waybillDetail.waybill.DRIVER_TIN || "-"}</p>
                              <p className="text-xs text-slate-300 font-mono mt-1 bg-slate-800 px-2 py-1 rounded inline-block">
                                {waybillDetail.waybill.CAR_NUMBER || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-700 rounded-lg">
                              <Calendar className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">თარიღი & სტატუსი</span>
                                <p className="text-sm text-slate-300 mt-1">{waybillDetail.waybill.CREATE_DATE}</p>
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
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-400" />
                          საქონლის სია
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">{waybillDetail.goods.length} დასახელება</span>
                      </div>
                      <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/80 border-b border-slate-800">
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">#</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">დასახელება</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">ერთეული</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">რაოდ.</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">ფასი</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">თანხა</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {waybillDetail.goods.map((item: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                                <td className="px-6 py-4 text-xs text-slate-600 font-mono">{i + 1}</td>
                                <td className="px-6 py-4">
                                  <p className="text-xs text-slate-200 font-medium leading-tight">{item.W_NAME}</p>
                                </td>
                                <td className="px-6 py-4 text-center text-xs text-slate-500">{item.UNIT_NAME}</td>
                                <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">{item.QUANTITY}</td>
                                <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">{Number(item.PRICE).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold text-white font-mono">{Number(item.AMOUNT).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="p-8 bg-slate-800/20 rounded-3xl border border-slate-800/40 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="flex-1">
                        {waybillDetail.waybill.COMMENT && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">კომენტარი</span>
                            <p className="text-sm text-slate-400 italic leading-relaxed">"{waybillDetail.waybill.COMMENT}"</p>
                          </div>
                        )}
                      </div>
                      <div className="text-center md:text-right min-w-[200px]">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">სულ გადასახდელი</span>
                        <p className="text-4xl font-black text-white tracking-tight">
                          {Number(waybillDetail.waybill.FULL_AMOUNT || 0).toFixed(2)} <span className="text-blue-500 text-2xl">₾</span>
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <XCircle className="w-16 h-16 text-slate-800" />
                    <p className="text-slate-500 font-medium">მონაცემები ვერ ჩაიტვირთა</p>
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
