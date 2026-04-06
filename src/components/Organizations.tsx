import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Building2, 
  Upload, 
  Search,
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Download,
  AlertCircle,
  WifiOff
} from "lucide-react";
import { motion } from "motion/react";

interface OrgResult {
  tin: string;
  name: string;
  address: string;
  isVatPayer: boolean;
}

interface OrganizationsProps {
  su: string;
  sp: string;
}

export default function Organizations({ su, sp }: OrganizationsProps) {
  // Excel Section State
  const [file, setFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(batchResults.length / pageSize);
  const paginatedResults = batchResults.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Name Search Section State
  const [nameInput, setNameInput] = useState("");
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false);
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [searchNameError, setSearchNameError] = useState<string | null>(null);

  // TIN Search Section State
  const [tinInput, setTinInput] = useState("");
  const [isSearchingTins, setIsSearchingTins] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
  const [searchResults, setSearchResults] = useState<OrgResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Internet Status Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // --- Excel Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setExcelError(null);
      setDownloadUrl(null);
      setBatchResults([]);
      setProgress(0);
      setCurrentPage(1);
    }
  };

  const getTinsFromExcel = async (file: File): Promise<{ tins: string[], headers: string[], allRows: any[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (rows.length < 2) throw new Error("ფაილი ცარიელია");
          
          const headers = rows[0] as string[];
          const tins = rows.slice(1).map(row => String(row[0] || "").trim().split(".")[0]);
          resolve({ tins, headers, allRows: rows.slice(1) });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const fetchOrgInfo = async (tin: string) => {
    const response = await fetch("/api/org/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ su, sp, tin })
    });
    if (!response.ok) {
      return { tin, name: "შეცდომა", address: "N/A", isVatPayer: false };
    }
    return await response.json();
  };

  const downloadExcel = (results: any[], headers: string[]) => {
    const formattedResults = results.map(res => {
      const row: any = {};
      headers.forEach((h, i) => { row[h || `Col_${i}`] = res.originalRow?.[i] || ""; });
      row["დასახელება"] = res.name;
      row["მისამართი"] = res.address;
      row["დღგ სტატუსი"] = res.isVatPayer ? "დღგ-ს გადამხდელი ✓" : "არა დღგ-ს გადამხდელი ✗";
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(formattedResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "მონაცემები");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "rs_ge_result.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const processExcel = async () => {
    if (!file) return;

    setIsProcessingExcel(true);
    setExcelError(null);
    setBatchResults([]);
    setProgress(0);
    setCurrentPage(1);
    
    try {
      const excelData = await getTinsFromExcel(file!);
      const tins = excelData.tins;
      const headers = excelData.headers;
      const allRows = excelData.allRows;
      const results: any[] = [];

      const totalTins = tins.length;
      setTotal(totalTins);
      
      const BATCH_SIZE = 5;

      for (let i = 0; i < totalTins; i += BATCH_SIZE) {
        if (!navigator.onLine) {
          setExcelError("ინტერნეტი გათიშულია. ველოდებით აღდგენას...");
          await new Promise(resolve => {
            const checkOnline = () => {
              if (navigator.onLine) {
                window.removeEventListener("online", checkOnline);
                resolve(true);
              }
            };
            window.addEventListener("online", checkOnline);
          });
          setExcelError(null);
        }

        const chunk = tins.slice(i, i + BATCH_SIZE);
        const chunkRows = allRows.slice(i, i + BATCH_SIZE);

        try {
          const chunkResults = await Promise.all(
            chunk.map(async (tin, idx) => {
              const info = await fetchOrgInfo(tin);
              return { ...info, originalRow: chunkRows[idx] };
            })
          );

          results.push(...chunkResults);
          setBatchResults([...results]);
          setProgress((results.length / totalTins) * 100);

        } catch (err) {
          console.error("Chunk error, retrying in 5s...", err);
          setExcelError("ხარვეზი კავშირში. ვცდით თავიდან 5 წამში...");
          await new Promise(r => setTimeout(r, 5000));
          i -= BATCH_SIZE; 
          setExcelError(null);
          continue;
        }

        await new Promise(r => setTimeout(r, 50));
      }

      downloadExcel(results, headers);
      setProgress(100);

    } catch (err: any) {
      setExcelError(err.message || "დამუშავების შეცდომა");
    } finally {
      setIsProcessingExcel(false);
    }
  };

  // --- Name Search Handlers ---

  const searchOrgsByName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setIsSearchingOrgs(true);
    setSearchNameError(null);
    setOrgsList([]);

    try {
      const response = await fetch("/api/org/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ su, sp, name: nameInput })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrgsList(data.rows || []);
      } else {
        setSearchNameError("ძებნა ვერ მოხერხდა");
      }
    } catch (err) {
      setSearchNameError("კავშირის შეცდომა");
    } finally {
      setIsSearchingOrgs(false);
    }
  };

  // --- TIN Search Handlers ---

  const searchTins = async () => {
    const tins = tinInput.split("\n").map(t => t.trim()).filter(t => t.length > 0);
    if (tins.length === 0) return;

    setIsSearchingTins(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchProgress({ current: 0, total: tins.length });

    const results: OrgResult[] = [];
    
    for (let i = 0; i < tins.length; i++) {
      const tin = tins[i];
      setSearchProgress({ current: i + 1, total: tins.length });
      
      try {
        const response = await fetch("/api/org/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ su, sp, tin })
        });
        
        if (response.ok) {
          const data = await response.json();
          results.push(data);
        } else {
          results.push({ tin, name: "შეცდომა", address: "N/A", isVatPayer: false });
        }
      } catch (err) {
        results.push({ tin, name: "კავშირის შეცდომა", address: "N/A", isVatPayer: false });
      }
      
      if (i < tins.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setSearchResults(results);
    setIsSearchingTins(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-8">
      {/* Internet Status */}
      <div className="space-y-4">
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/20 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between text-rose-400"
          >
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5" />
              <span className="font-bold">⚠️ ინტერნეტი წყვეტილია — ველოდებით აღდგენას...</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">ორგანიზაციების ძიება</h1>
          <p className="text-slate-400 text-sm">TIN-ების გადამოწმება, Excel დამუშავება და ძებნა სახელით</p>
        </div>
      </div>

      {/* Name Search Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">ძებნა სახელით</h2>
        </div>

        <form onSubmit={searchOrgsByName} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="ორგანიზაციის დასახელება..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isSearchingOrgs || !nameInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {isSearchingOrgs ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            ძებნა
          </button>
        </form>

        {searchNameError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {searchNameError}
          </div>
        )}

        {orgsList.length > 0 && (
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">მისამართი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {orgsList.map((org, i) => (
                  <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-300">{org.TIN}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{org.NAME}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{org.ADDRESS}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Excel Processing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">ფაილის ატვირთვა</h2>
          </div>

          <div className="space-y-6">
            <div className="relative p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/30 flex flex-col items-center justify-center text-center group hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
              </div>
              <p className="text-sm text-slate-300 font-medium mb-1">
                {file ? file.name : "ჩააგდეთ XLSX ფაილი ან დააჭირეთ ასარჩევად"}
              </p>
              <p className="text-xs text-slate-500">TIN-ები უნდა იყოს A სვეტში</p>
              <input 
                type="file" 
                accept=".xlsx" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {excelError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {excelError}
              </div>
            )}

            {isProcessingExcel ? (
              <div style={{width: "100%"}}>
                <div style={{
                  background: "#1e293b",
                  borderRadius: 8,
                  height: 44,
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* შევსების ზოლი */}
                  <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #3b82f6, #6366f1)",
                    borderRadius: 8,
                    transition: "width 0.3s ease"
                  }} />
                  {/* ტექსტი */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    zIndex: 1
                  }}>
                    {progress < 100 
                      ? `მუშავდება... ${Math.round(progress)}%`
                      : "✅ დასრულდა!"}
                  </div>
                </div>
              </div>
            ) : downloadUrl ? (
              <div className="flex gap-3">
                <button
                  onClick={processExcel}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-5 h-5" />
                  ჩამოტვირთვა
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setDownloadUrl(null);
                    setProgress(0);
                    setBatchResults([]);
                  }}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl border border-slate-700 transition-all"
                  title="თავიდან ატვირთვა"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => processExcel()}
                disabled={!file || isProcessingExcel}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <FileSpreadsheet className="w-5 h-5" />
                დამუშავება
              </button>
            )}
          </div>
        </motion.div>

        {/* Section 2: TIN Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">TIN-ით ძიება</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">TIN-ები (თითო ხაზზე)</label>
              <textarea 
                value={tinInput}
                onChange={(e) => setTinInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-32 resize-none font-mono text-sm"
                placeholder="206322102&#10;404400000"
              />
            </div>

            <button
              onClick={searchTins}
              disabled={!tinInput.trim() || isSearchingTins}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isSearchingTins ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  იძებნება {searchProgress.current}/{searchProgress.total}...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  მოძებნა
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* TIN Search Results */}
      {searchResults.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">TIN ძიების შედეგები</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">მისამართი</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">დღგ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {searchResults.map((res, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-300">{res.tin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{res.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{res.address}</span>
                    </td>
                    <td className="px-6 py-4">
                      {res.isVatPayer ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          კი ✓
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                          <XCircle className="w-4 h-4" />
                          არა ✗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Results Table */}
      {batchResults.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">შედეგები რეალურ დროში</h3>
            <span className="text-xs font-mono text-slate-500">{batchResults.length} / {total}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIN</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">მისამართი</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">დღგ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedResults.map((res, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-300">{res.tin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{res.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{res.address}</span>
                    </td>
                    <td className="px-6 py-4">
                      {res.isVatPayer ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          კი ✓
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                          <XCircle className="w-4 h-4" />
                          არა ✗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">გვერდზე:</span>
              <select 
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                ← წინა
              </button>
              <span className="text-sm font-bold text-white">
                გვერდი {currentPage} / {totalPages || 1}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                შემდეგი →
              </button>
            </div>

            <div className="text-sm font-bold text-slate-500">
              სულ: {batchResults.length} შედეგი
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
