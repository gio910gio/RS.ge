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
  const [currentPage, setCurrentPage] = useState(0);
  const [currentTab, setCurrentTab] = useState("tab_given");
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

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

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
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
