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
  WAYBILL_NUMBER: string;
  CATEGORY_TXT: string;
  WAYBILL_TYPE: number;
  BUYER_TIN: string;
  ORGANIZATION: string;
  FULL_AMOUNT: number;
  CAR_NUMBER: string;
  CREATE_DATE: string;
  BEGIN_DATE: string;
  DELIVERY_DATE: string;
  CLOSE_DATE: string;
  START_ADDRESS: string;
  END_ADDRESS: string;
  DRIVER: string;
  STATUS_NAME: string;
  TRANSPORT_COAST: number;
  WAYBILL_COMMENT: string;
  TRAN_COST_PAYER: string;
}

interface WaybillDetail {
  waybill: any;
  goods: any[];
}

interface WaybillsProps {
  su: string;
  sp: string;
}

// --- Constants ---

const GE_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
const YEARS = [2023, 2024, 2025, 2026];

// --- Components ---

function CustomDatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [y, m, d] = value.split("-").map(Number);

  const handleUpdate = (newY: number, newM: number, newD: number) => {
    // Basic day validation (clamping to 1-31 is handled by the select, 
    // but we could add more logic here if needed. Keeping it simple as requested.)
    const formattedY = newY;
    const formattedM = String(newM).padStart(2, "0");
    const formattedD = String(newD).padStart(2, "0");
    onChange(`${formattedY}-${formattedM}-${formattedD}`);
  };

  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
      <Calendar className="w-4 h-4 text-slate-500 mr-1" />
      <select
        value={d}
        onChange={(e) => handleUpdate(y, m, Number(e.target.value))}
        className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer hover:text-white transition-colors appearance-none"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
          <option key={day} value={day} className="bg-slate-900 text-slate-300">
            {String(day).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        value={m}
        onChange={(e) => handleUpdate(y, Number(e.target.value), d)}
        className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer hover:text-white transition-colors appearance-none"
      >
        {GE_MONTHS.map((month, i) => (
          <option key={i} value={i + 1} className="bg-slate-900 text-slate-300">
            {month}
          </option>
        ))}
      </select>
      <select
        value={y}
        onChange={(e) => handleUpdate(Number(e.target.value), m, d)}
        className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer hover:text-white transition-colors appearance-none"
      >
        {YEARS.map((year) => (
          <option key={year} value={year} className="bg-slate-900 text-slate-300">
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Main Component ---

export default function Waybills({ su, sp }: WaybillsProps) {
  const [loading, setLoading] = useState(false);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentTab, setCurrentTab] = useState("tab_given");
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [filterText, setFilterText] = useState("");

  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [waybillDetail, setWaybillDetail] = useState<WaybillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Handlers ---

  const fetchWaybills = async (page: number = 0) => {
    setLoading(true);
    try {
      const response = await fetch("/api/waybills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          su, 
          sp, 
          currentTab, 
          startDate, 
          endDate, 
          filterExpression: filterText,
          startRowIndex: page * 40 
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
    fetchWaybills(currentPage);
  }, [currentTab, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchWaybills(0);
  };

  const getStatusColor = (status: string) => {
    if (status.includes("აქტიური")) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    if (status.includes("დასრულებული")) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    if (status.includes("გაუქმებული")) return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

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

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
              <CustomDatePicker value={startDate} onChange={setStartDate} />
              <CustomDatePicker value={endDate} onChange={setEndDate} />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="ძებნა..."
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none w-64"
                />
              </div>
              <button 
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-700 transition-all"
              >
                გაფილტვრა
              </button>
            </form>
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
                  ) : waybills.length > 0 ? (
                    waybills.map((wb) => (
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
                            <span className="text-sm font-bold text-white">{wb.WAYBILL_NUMBER}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300 block max-w-[200px] truncate">{wb.ORGANIZATION}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-500">{wb.BUYER_TIN}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white">{Number(wb.FULL_AMOUNT).toFixed(2)} ₾</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400">{wb.CAR_NUMBER || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(wb.STATUS_NAME)}`}>
                            {wb.STATUS_NAME}
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
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                სულ: <span className="text-slate-300 font-bold">{totalCount}</span> ჩანაწერი
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg border border-slate-700 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-300 px-4">
                  {currentPage + 1} / {Math.ceil(totalCount / 40) || 1}
                </span>
                <button 
                  disabled={(currentPage + 1) * 40 >= totalCount || loading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg border border-slate-700 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Details Sidebar */}
      <AnimatePresence>
        {selectedWaybill && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[500px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white leading-none mb-1">{selectedWaybill.WAYBILL_NUMBER}</h2>
                  <p className="text-xs text-slate-500">დეტალური ინფორმაცია</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedWaybill(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-slate-500 text-sm">იტვირთება მონაცემები...</p>
                </div>
              ) : waybillDetail ? (
                <>
                  {/* Parties */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">გამყიდველი</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-1">{waybillDetail.waybill.SELLER_NAME}</p>
                      <p className="text-xs text-slate-400 font-mono">{waybillDetail.waybill.SELLER_TIN}</p>
                      {waybillDetail.waybill.SELLER_IS_VAT_PAYER && (
                        <span className="mt-2 inline-block px-2 py-0.5 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold rounded border border-emerald-400/20">დღგ გადამხდელი</span>
                      )}
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">მყიდველი</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-1">{waybillDetail.waybill.BUYER_NAME}</p>
                      <p className="text-xs text-slate-400 font-mono">{waybillDetail.waybill.BUYER_TIN}</p>
                      {waybillDetail.waybill.BUYER_IS_VAT_PAYER && (
                        <span className="mt-2 inline-block px-2 py-0.5 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold rounded border border-emerald-400/20">დღგ გადამხდელი</span>
                      )}
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">დაწყების ადგილი</span>
                        <p className="text-sm text-slate-300">{waybillDetail.waybill.START_ADDRESS}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">მიტანის ადგილი</span>
                        <p className="text-sm text-slate-300">{waybillDetail.waybill.END_ADDRESS}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800 grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">მძღოლი</span>
                      </div>
                      <p className="text-sm text-slate-200">{waybillDetail.waybill.DRIVER_NAME || "-"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">მანქანის ნომერი</span>
                      </div>
                      <p className="text-sm text-slate-200 font-mono">{waybillDetail.waybill.CAR_NUMBER || "-"}</p>
                    </div>
                  </div>

                  {/* Goods Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        საქონლის სია
                      </h3>
                      <span className="text-xs text-slate-500">{waybillDetail.goods.length} დასახელება</span>
                    </div>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800">
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">დასახელება</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">რაოდ.</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">ფასი</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">თანხა</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {waybillDetail.goods.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-900/50">
                              <td className="px-4 py-3">
                                <p className="text-xs text-slate-300 leading-tight">{item.W_NAME}</p>
                                <span className="text-[9px] text-slate-600">{item.UNIT_NAME}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-slate-400">{item.QUANTITY}</td>
                              <td className="px-4 py-3 text-right text-xs text-slate-400">{Number(item.PRICE).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-xs font-bold text-white">{Number(item.AMOUNT).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900/50">
                            <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-slate-500">ჯამი:</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-400">
                              {waybillDetail.goods.reduce((acc: number, cur: any) => acc + Number(cur.AMOUNT || 0), 0).toFixed(2)} ₾
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-slate-500">სულ გადასახდელი:</span>
                      <span className="text-2xl font-bold text-white">{Number(waybillDetail.waybill.FULL_AMOUNT || 0).toFixed(2)} ₾</span>
                    </div>
                    {waybillDetail.waybill.COMMENT && (
                      <div className="p-4 bg-blue-600/5 rounded-xl border border-blue-600/10">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">კომენტარი</span>
                        <p className="text-xs text-slate-400 italic">{waybillDetail.waybill.COMMENT}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <XCircle className="w-12 h-12 text-slate-800" />
                  <p className="text-slate-500 text-sm">მონაცემები ვერ ჩაიტვირთა</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
