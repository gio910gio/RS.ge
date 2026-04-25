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
            className="p-4 rounded-2xl flex items-center justify-between border"
            style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", borderColor: "rgba(244, 63, 94, 0.2)", color: "#f43f5e" }}
          >
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5" />
              <span className="font-bold">⚠️ ინტერნეტი წყვეტილია — ველოდებით აღდგენას...</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ 
            background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))",
            boxShadow: "0 8px 16px rgba(37, 99, 235, 0.2)"
          }}
        >
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>ორგანიზაციების ძიება</h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>TIN-ების გადამოწმება, Excel დამუშავება და ძებნა სახელით</p>
        </div>
      </div>

      {/* Name Search Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border shadow-xl space-y-6"
        style={{ 
          backgroundColor: "var(--bg-surface)", 
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-card)"
        }}
      >
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>ძებნა სახელით</h2>
        </div>

        <form onSubmit={searchOrgsByName} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input 
              type="text" 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="ორგანიზაციის დასახელება..."
              className="w-full rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all border"
              style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
            />
          </div>
          <button 
            type="submit"
            disabled={isSearchingOrgs || !nameInput.trim()}
            className="text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))" }}
          >
            {isSearchingOrgs ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            ძებნა
          </button>
        </form>

        {searchNameError && (
          <div 
            className="p-4 border rounded-xl flex items-center gap-3 text-sm"
            style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", borderColor: "rgba(244, 63, 94, 0.2)", color: "#f43f5e" }}
          >
            <AlertCircle className="w-4 h-4" />
            {searchNameError}
          </div>
        )}

        {orgsList.length > 0 && (
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>TIN</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>მისამართი</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {orgsList.map((org, i) => (
                  <tr 
                    key={i} 
                    className="transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--nav-hover-bg)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? "transparent" : "var(--bg-surface-2)"}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{org.TIN}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{org.NAME}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{org.ADDRESS}</span>
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
          className="rounded-2xl p-6 border shadow-xl transition-all"
          style={{ 
            backgroundColor: "var(--bg-surface)", 
            borderColor: "var(--border-default)",
            boxShadow: "var(--shadow-card)"
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>ფაილის ატვირთვა</h2>
          </div>

          <div className="space-y-6">
            <div 
              className="relative p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-500/50 transition-all"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.05)", borderColor: "var(--border-default)" }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md"
                style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }}
              >
                <Upload className="w-6 h-6 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                {file ? file.name : "ჩააგდეთ XLSX ფაილი ან დააჭირეთ ასარჩევად"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>TIN-ები უნდა იყოს A სვეტში</p>
              <input 
                type="file" 
                accept=".xlsx" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {excelError && (
              <div 
                className="p-4 border rounded-xl flex items-center gap-3 text-sm"
                style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", borderColor: "rgba(244, 63, 94, 0.2)", color: "#f43f5e" }}
              >
                <AlertCircle className="w-4 h-4" />
                {excelError}
              </div>
            )}

            {isProcessingExcel ? (
              <div style={{width: "100%"}}>
                <div style={{
                  background: "var(--bg-surface-2)",
                  borderRadius: 12,
                  height: 48,
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid var(--border-default)"
                }}>
                  {/* შევსების ზოლი */}
                  <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, var(--bg-header-from), var(--bg-header-to))",
                    borderRadius: 12,
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
                    fontWeight: 700,
                    fontSize: 14,
                    zIndex: 1,
                    textShadow: "0 1px 2px rgba(0,0,0,0.1)"
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
                  className="px-4 border transition-all rounded-xl hover:opacity-70"
                  style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-muted)" }}
                  title="თავიდან ატვირთვა"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => processExcel()}
                disabled={!file || isProcessingExcel}
                className="w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))" }}
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
          className="rounded-2xl p-6 border shadow-xl"
          style={{ 
            backgroundColor: "var(--bg-surface)", 
            borderColor: "var(--border-default)",
            boxShadow: "var(--shadow-card)"
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>TIN-ით ძიება</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>TIN-ები (თითო ხაზზე)</label>
              <textarea 
                value={tinInput}
                onChange={(e) => setTinInput(e.target.value)}
                className="w-full rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all h-32 resize-none font-mono text-sm border"
                style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                placeholder="206322102&#10;404400000"
              />
            </div>

            <button
              onClick={searchTins}
              disabled={!tinInput.trim() || isSearchingTins}
              className="w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--bg-header-from), var(--bg-header-to))" }}
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
          className="rounded-2xl overflow-hidden border shadow-xl"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="p-6 border-b" style={{ borderColor: "var(--border-default)" }}>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>TIN ძიების შედეგები</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>TIN</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>მისამართი</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დღგ</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {searchResults.map((res, i) => (
                  <tr 
                    key={i} 
                    className="transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--nav-hover-bg)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{res.tin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{res.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{res.address}</span>
                    </td>
                    <td className="px-6 py-4">
                      {res.isVatPayer ? (
                        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          კი ✓
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-500 text-xs font-bold">
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
          className="rounded-2xl overflow-hidden border shadow-xl"
          style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: "var(--border-default)" }}>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>შედეგები რეალურ დროში</h3>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{batchResults.length} / {total}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>TIN</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დასახელება</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>მისამართი</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>დღგ</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {paginatedResults.map((res, i) => (
                  <tr 
                    key={i} 
                    className="transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--nav-hover-bg)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{res.tin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{res.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{res.address}</span>
                    </td>
                    <td className="px-6 py-4">
                      {res.isVatPayer ? (
                        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          კი ✓
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-500 text-xs font-bold">
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
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: "var(--bg-surface-2)", borderColor: "var(--border-default)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>გვერდზე:</span>
              <select 
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all border"
                style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
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
                className="text-sm font-bold transition-colors disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
              >
                ← წინა
              </button>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                გვერდი <span className="text-blue-500">{currentPage}</span> / {totalPages || 1}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="text-sm font-bold transition-colors disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
              >
                შემდეგი →
              </button>
            </div>

            <div className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              სულ: <span style={{ color: "var(--text-primary)" }}>{batchResults.length}</span> შედეგი
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
