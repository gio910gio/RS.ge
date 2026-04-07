import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import * as XLSX from "xlsx";
import axios from "axios";

const app = express();
const PORT = 3000;
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const SOAP_URL = "https://services.rs.ge/waybillservice/waybillservice.asmx";

// ========== SOAP helper ==========
async function soapCall(action: string, bodyXml: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    ${bodyXml}
  </s:Body>
</s:Envelope>`;

  const response = await axios.post(SOAP_URL, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": `http://tempuri.org/${action}`
    }
  });

  return response.data;
}

// XML-დან DataTable-ის პარსინგი
function parseDataTable(xmlStr: string): any[] {
  if (!xmlStr) return [];
  try {
    const rows: any[] = [];
    const rowMatches = xmlStr.match(/<WAYBILL>([\s\S]*?)<\/WAYBILL>/g) || [];
    for (const row of rowMatches) {
      const obj: any = {};
      const inner = row.replace(/<\/?WAYBILL>/g, "");
      const fields = inner.match(/<([A-Z_]+)>([^<]*)<\/\1>/g) || [];
      for (const field of fields) {
        const match = field.match(/<([A-Z_]+)>([^<]*)<\/\1>/);
        if (match) obj[match[1]] = match[2];
      }
      if (Object.keys(obj).length > 0) rows.push(obj);
    }
    console.log("Parsed rows:", rows.length, Object.keys(rows[0] || {}));
    return rows;
  } catch (e) {
    console.log("Parse error:", e);
    return [];
  }
}

// ========== EAPI helper ==========
const EAPI_USER = "tbilisi";
const EAPI_PASS = "123456";

async function getEapiToken(): Promise<string | null> {
  try {
    const resp = await axios.post("https://eapi.rs.ge/Users/Authenticate", {
      AUTH_TYPE: 0,
      DEVICE_CODE: null,
      PASSWORD: EAPI_PASS,
      USERNAME: EAPI_USER
    });
    const token = resp.data?.DATA?.ACCESS_TOKEN;
    console.log("Token:", token?.substring(0, 20));
    return token || null;
  } catch (e) {
    console.error("EAPI Auth error:", e);
    return null;
  }
}

async function getEapiOrgInfo(token: string, tin: string) {
  try {
    const resp = await axios.post("https://eapi.rs.ge/Org/GetOrgInfoByTin", 
      { Tin: tin },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = resp.data?.DATA;
    const result = data ? {
      name: data.Name,
      address: data.Address,
      isVatPayer: data.IsVatPayer
    } : null;

    console.log("Processing TIN:", tin);
    console.log("Result:", JSON.stringify(result));

    return result;
  } catch (e) {
    console.error("EAPI OrgInfo error:", e);
    return null;
  }
}

async function getOrgInfoWithRetry(token: string, tin: string, retries = 3) {
  let currentToken = token;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await axios.post(
        "https://eapi.rs.ge/Org/GetOrgInfoByTin",
        { Tin: tin },
        { 
          headers: { Authorization: `Bearer ${currentToken}` }, 
          timeout: 30000 
        }
      );
      const d = resp.data?.DATA;
      const result = d ? {
        tin,
        name: d.Name || "ვერ მოიძებნა",
        address: d.Address || "N/A",
        isVat: d.IsVatPayer === true 
          ? "დღგ-ს გადამხდელი ✓" 
          : "არა დღგ-ს გადამხდელი ✗"
      } : null;

      console.log("Processing TIN:", tin);
      console.log("Result:", JSON.stringify(result));

      if (result) return result;
    } catch (e: any) {
      console.log(`TIN ${tin} attempt ${attempt} failed: ${e.message}`);
      if (attempt < retries) {
        // ყოველ retry-ზე უფრო დიდი pause
        await new Promise(r => setTimeout(r, attempt * 3000));
        // token განახლება თუ connection დაიკარგა
        try {
          const newToken = await getEapiToken();
          if (newToken) currentToken = newToken;
        } catch {}
      }
    }
  }
  return { tin, name: "შეცდომა", address: "N/A", isVat: "N/A" };
}

// ========== მომხმარებლის შემოწმება ==========
app.post("/api/check-user", async (req: any, res: any) => {
  const { su, sp } = req.body;
  if (!su || !sp) return res.status(400).json({ error: "su და sp სავალდებულოა" });

  try {
    const xml = await soapCall("chek_service_user", `
      <chek_service_user xmlns="http://tempuri.org/">
        <su>${su}</su>
        <sp>${sp}</sp>
      </chek_service_user>`);

    const result = xml.match(/<chek_service_userResult>(.*?)<\/chek_service_userResult>/s)?.[1] || "false";
    console.log("Check user result:", result);
    res.json({ ok: true, result });
  } catch (e: any) {
    console.error("Check user error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== ზედნადებების სია ==========
app.post("/api/waybills", async (req: any, res: any) => {
  const { su, sp, startDate, endDate, startRowIndex, type } = req.body;
  if (!su || !sp) return res.status(400).json({ error: "su და sp სავალდებულოა" });

  try {
    const xml = await soapCall("get_waybills_ex", `
      <get_waybills_ex xmlns="http://tempuri.org/">
        <su>${su}</su>
        <sp>${sp}</sp>
        <itypes>${type || ""}</itypes>
        <buyer_tin></buyer_tin>
        <statuses></statuses>
        <car_number></car_number>
        <begin_date_s>${startDate ? startDate + "T00:00:00" : ""}</begin_date_s>
        <begin_date_e>${endDate ? endDate + "T23:59:59" : ""}</begin_date_e>
        <create_date_s xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <create_date_e xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <driver_tin></driver_tin>
        <delivery_date_s xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <delivery_date_e xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <full_amount xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <waybill_number></waybill_number>
        <close_date_s xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <close_date_e xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
        <s_user_ids></s_user_ids>
        <comment></comment>
        <is_confirmed xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
      </get_waybills_ex>`);

    const xmlResult = xml.match(/<get_waybills_exResult>(.*?)<\/get_waybills_exResult>/s)?.[1] || "";
    console.log("SU:", su, "SP:", sp);
    console.log("SOAP response:", xmlResult?.substring(0, 500));
    console.log("Waybills raw (first 300):", String(xmlResult).substring(0, 300));

    const rows = parseDataTable(xmlResult);
    res.json({ rows, total: rows.length });
  } catch (e: any) {
    console.error("Waybills error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== ერთი ზედნადების დეტალები ==========
app.post("/api/waybill/detail", async (req: any, res: any) => {
  const { su, sp, waybillId } = req.body;
  if (!su || !sp || !waybillId) return res.status(400).json({ error: "Missing params" });

  try {
    // ზედნადების header
    const xmlW = await soapCall("get_waybill", `
      <get_waybill xmlns="http://tempuri.org/">
        <su>${su}</su>
        <sp>${sp}</sp>
        <w_id>${waybillId}</w_id>
      </get_waybill>`);

    const waybillXml = xmlW.match(/<get_waybillResult>(.*?)<\/get_waybillResult>/s)?.[1] || "";
    const waybillRows = parseDataTable(waybillXml);

    // საქონლის სია
    const xmlG = await soapCall("get_waybill_goods_list", `
      <get_waybill_goods_list xmlns="http://tempuri.org/">
        <su>${su}</su>
        <sp>${sp}</sp>
        <w_id>${waybillId}</w_id>
      </get_waybill_goods_list>`);

    console.log("Goods XML:", xmlG?.substring(0, 500));
    console.log("waybillId:", waybillId);

    const goodsXml = xmlG.match(/<get_waybill_goods_listResult>(.*?)<\/get_waybill_goods_listResult>/s)?.[1] || "";
    
    // Custom parser for goods
    const goodsMatches = goodsXml?.match(/<GOODS>([\s\S]*?)<\/GOODS>/g) 
      || goodsXml?.match(/<Table>([\s\S]*?)<\/Table>/g) 
      || [];

    const goods = goodsMatches.map(row => {
      const obj: any = {};
      const inner = row.replace(/<\/?(GOODS|Table)>/g, "");
      const fields = inner.match(/<([A-Z_]+)>([^<]*)<\/\1>/g) || [];
      for (const field of fields) {
        const match = field.match(/<([A-Z_]+)>([^<]*)<\/\1>/);
        if (match) obj[match[1]] = match[2];
      }
      return obj;
    });

    res.json({
      waybill: waybillRows[0] || {},
      goods
    });
  } catch (e: any) {
    console.error("Detail error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== ორგანიზაციის ინფო TIN-ით ==========
app.post("/api/org/info", async (req: any, res: any) => {
  const { tin } = req.body;
  if (!tin) return res.status(400).json({ error: "Missing tin" });

  try {
    const token = await getEapiToken();
    if (!token) return res.status(401).json({ error: "EAPI ავტორიზაცია ვერ მოხერხდა" });

    const info = await getEapiOrgInfo(token, tin);
    if (!info) return res.status(404).json({ error: "ორგანიზაცია ვერ მოიძებნა" });

    res.json({ 
      ok: true, 
      tin, 
      name: info.name, 
      address: info.address, 
      isVatPayer: info.isVatPayer 
    });
  } catch (e: any) {
    console.error("Org info error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== Excel ბულკ დამუშავება ==========
app.post("/api/org/batch", upload.single("file"), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "ფაილი არ არის" });

  try {
    const token = await getEapiToken();
    if (!token) return res.status(401).json({ error: "EAPI ავტორიზაცია ვერ მოხერხდა" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (data.length < 2) return res.status(400).json({ error: "ფაილი ცარიელია" });

    const headers = data[0] as string[];
    const rows = data.slice(1);
    const results: any[] = [];

    // Set headers for streaming
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");

    const BATCH_SIZE = 5;
    let currentToken = token;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      
      const chunkResults = await Promise.all(
        chunk.map(async (row) => {
          const tin = String(row[0] || "").trim().split(".")[0];
          const info = await getOrgInfoWithRetry(currentToken, tin);

          console.log(`[${new Date().toLocaleTimeString()}] ${results.length + 1}/${rows.length} - TIN: ${tin}`);

          const newRow: any = {};
          headers.forEach((h: string, idx: number) => { newRow[h || `Col_${idx}`] = row[idx]; });
          newRow["დასახელება"]  = info.name;
          newRow["მისამართი"]   = info.address;
          newRow["დღგ სტატუსი"] = info.isVat;
          return newRow;
        })
      );

      results.push(...chunkResults);

      // Token refresh every 100 TINs
      if (results.length % 100 === 0) {
        try {
          const newToken = await getEapiToken();
          if (newToken) currentToken = newToken;
        } catch {}
      }

      // Send progress chunk
      res.write(JSON.stringify({ processed: results.length, total: rows.length }) + "\n");

      await new Promise(r => setTimeout(r, 50));
    }

    const newSheet = XLSX.utils.json_to_sheet(results);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newSheet, "მონაცემები");
    const buffer = XLSX.write(newWb, { type: "buffer", bookType: "xlsx" });

    // Send final chunk with base64 data
    res.write(JSON.stringify({ done: true, base64: buffer.toString("base64") }) + "\n");
    res.end();
  } catch (e: any) {
    console.error("Batch error:", e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(JSON.stringify({ error: e.message }) + "\n");
      res.end();
    }
  }
});

// ========== ორგანიზაციის ძებნა სახელით ==========
app.post("/api/org/search", async (req: any, res: any) => {
  const { su, sp, name } = req.body;
  if (!su || !sp) return res.status(400).json({ error: "su და sp სავალდებულოა" });

  try {
    const xml = await soapCall("get_payers", `
      <get_payers xmlns="http://tempuri.org/">
        <su>${su}</su>
        <sp>${sp}</sp>
        <name>${name || ""}</name>
      </get_payers>`);

    const xmlResult = xml.match(/<get_payersResult>(.*?)<\/get_payersResult>/s)?.[1] || "";
    const rows = parseDataTable(xmlResult);
    res.json({ rows });
  } catch (e: any) {
    console.error("Search orgs error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== სერვერის გაშვება ==========
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`   /api/check-user      — მომხმარებლის შემოწმება`);
    console.log(`   /api/waybills        — ზედნადებების სია`);
    console.log(`   /api/waybill/detail  — ზედნადების დეტალები`);
    console.log(`   /api/org/info        — ორგ. ინფო TIN-ით`);
    console.log(`   /api/org/batch       — Excel დამუშავება`);
  });
}

startServer();