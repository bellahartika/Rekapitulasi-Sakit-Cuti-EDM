import { useState, useCallback } from "react";

const SICK_KEYWORDS = ["sakit", "sick"];
const LEAVE_KEYWORDS = ["cuti", "leave", "annual leave", "izin"];

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}
function isSick(wm: string) {
  return SICK_KEYWORDS.some((k) => norm(wm).includes(k));
}
function isLeave(wm: string) {

  return LEAVE_KEYWORDS.some((k) => norm(wm).includes(k));
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) =>
      h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/ /g, "_")
    );
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = "",
      inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQ = !inQ;
      } else if (line[i] === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += line[i];
      }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").replace(/^"|"$/g, "");
    });
    return obj;
  });
}

function formatDate(row) {
  const d = row.day || (row.date || "").split("-")[2] || "";
  const m = row.month || (row.date || "").split("-")[1] || "";
  const y = row.year || (row.date || "").split("-")[0] || "";
  if (row.date && !row.day) return row.date;
  if (d && m && y)
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  return row.date || "-";
}

const DUMMY = [
  {
    user: "Andi Pratama",
    sick: ["05/01/2025", "06/01/2025"],
    leave: ["20/01/2025", "21/01/2025", "22/01/2025"],
  },
  { user: "Sari Dewi", sick: ["10/02/2025"], leave: ["14/02/2025"] },
  {
    user: "Budi Santoso",
    sick: ["03/03/2025", "04/03/2025", "05/03/2025"],
    leave: [],
  },
  {
    user: "Rina Kusuma",
    sick: [],
    leave: ["17/04/2025", "18/04/2025", "19/04/2025", "20/04/2025"],
  },
  {
    user: "Deni Wahyu",
    sick: ["22/05/2025"],
    leave: ["01/06/2025", "02/06/2025"],
  },
];

export default function App() {
  const [summary, setSummary] = useState(DUMMY);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState(null);
  const [isDummy, setIsDummy] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      const map = {};
      rows.forEach((row) => {
        const user = row.user || row.name || "Unknown";
        if (!map[user]) map[user] = { user, sick: [], leave: [] };
        const wm = row.work_mode || "";
        const dt = formatDate(row);
        if (isSick(wm)) map[user].sick.push(dt);
        else if (isLeave(wm)) map[user].leave.push(dt);
      });
      const result = Object.values(map).filter(
        (u) => u.sick.length > 0 || u.leave.length > 0
      );
      setSummary(result);
      setIsDummy(false);
      setExpandedUser(null);
      setSearch("");
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const filtered = summary.filter((u) =>
    u.user.toLowerCase().includes(search.toLowerCase())
  );
  const totalSakit = filtered.reduce((a, u) => a + u.sick.length, 0);
  const totalCuti = filtered.reduce((a, u) => a + u.leave.length, 0);

  const exportCSV = () => {
    const rows = [
      ["Nama", "Total Sakit", "Total Cuti", "Tanggal Sakit", "Tanggal Cuti"],
      ...filtered.map((u) => [
        u.user,
        u.sick.length,
        u.leave.length,
        u.sick.join("; "),
        u.leave.join("; "),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekap_sakit_cuti.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportMsg("✓ CSV berhasil didownload!");
    setTimeout(() => setExportMsg(""), 3000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        fontFamily: "'DM Mono', monospace",
        color: "#e8e6df",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 3px; }
        .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:500; letter-spacing:0.5px; }
        .badge-sick { background:#2d1515; color:#f87171; border:1px solid #3d1f1f; }
        .badge-leave { background:#152238; color:#60a5fa; border:1px solid #1e3450; }
        .drop-zone { border:1.5px dashed #2e3140; border-radius:10px; padding:10px 18px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s; background:#13161f; }
        .drop-zone:hover, .drop-zone.drag-on { border-color:#6ee7b7; background:#14211d; }
        .stat-card { background:#13161f; border:1px solid #1e2130; border-radius:12px; padding:16px 20px; }
        .search-box { background:#13161f; border:1px solid #1e2130; color:#e8e6df; padding:9px 14px; border-radius:8px; font-family:'DM Mono',monospace; font-size:13px; outline:none; width:100%; max-width:280px; transition:border-color 0.2s; }
        .search-box:focus { border-color:#6ee7b7; }
        .user-row { background:#13161f; border:1px solid #1e2130; border-radius:10px; cursor:pointer; transition:border-color 0.2s; }
        .user-row:hover { border-color:#2e3150; }
        .user-row.open { border-color:#6ee7b744; }
        .date-chip { display:inline-flex; padding:3px 9px; border-radius:5px; font-size:11px; margin:2px; }
        .chip-sick { background:#1f1515; color:#fca5a5; border:1px solid #3d2020; }
        .chip-leave { background:#151a2a; color:#93c5fd; border:1px solid #1e2d4a; }
        .btn-export { background:#6ee7b718; border:1px solid #6ee7b740; color:#6ee7b7; padding:8px 14px; border-radius:8px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; transition:background 0.2s; white-space:nowrap; }
        .btn-export:hover { background:#6ee7b730; }
        .dummy-pill { background:#1a1f2e; border:1px solid #2a3050; border-radius:6px; padding:8px 14px; font-size:11px; color:#6272a4; display:flex; align-items:center; gap:8px; margin-bottom:18px; }
        .export-toast { position:fixed; bottom:24px; right:24px; background:#14211d; border:1px solid #6ee7b755; color:#6ee7b7; padding:10px 18px; border-radius:8px; font-size:12px; z-index:999; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {exportMsg && <div className="export-toast">{exportMsg}</div>}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1d2a", padding: "20px 28px" }}>
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 800,
                fontSize: "clamp(20px,4vw,38px)",
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              REKAP
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="badge badge-sick">⬤ SAKIT</span>
              <span className="badge badge-leave">⬤ CUTI</span>
            </div>
          </div>
          <label htmlFor="csvFile" style={{ cursor: "pointer" }}>
            <div
              className={`drop-zone${dragging ? " drag-on" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span style={{ fontSize: 20 }}>📂</span>
              <div>
                <div style={{ fontSize: 12, color: "#6ee7b7" }}>
                  {isDummy ? "Upload CSV kamu" : "Ganti CSV"}
                </div>
                <div style={{ fontSize: 10, color: "#4a4f6a" }}>
                  drag & drop atau klik
                </div>
              </div>
            </div>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files[0]) processFile(e.target.files[0]);
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "22px 28px" }}>
        {isDummy && (
          <div className="dummy-pill">
            <span>👁</span>
            <span>
              Menampilkan{" "}
              <strong style={{ color: "#8892b0" }}>data contoh</strong> — upload
              CSV kamu untuk melihat data asli
            </span>
          </div>
        )}

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {[
            { label: "KARYAWAN", value: filtered.length, color: "#e8e6df" },
            { label: "HARI SAKIT", value: totalSakit, color: "#f87171" },
            { label: "HARI CUTI", value: totalCuti, color: "#60a5fa" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  color: "#4a4f6a",
                  fontSize: 10,
                  marginTop: 2,
                  letterSpacing: "0.6px",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
          <div
            className="stat-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button className="btn-export" onClick={exportCSV}>
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <input
            className="search-box"
            placeholder="🔍  Cari nama karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 85px 85px 1fr 1fr",
            gap: 10,
            padding: "5px 14px",
            color: "#4a4f6a",
            fontSize: 10,
            letterSpacing: "0.8px",
            marginBottom: 6,
          }}
        >
          <span>NAMA</span>
          <span>SAKIT</span>
          <span>CUTI</span>
          <span>TGL SAKIT</span>
          <span>TGL CUTI</span>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                color: "#4a4f6a",
                textAlign: "center",
                padding: 36,
                fontSize: 13,
              }}
            >
              Tidak ada data ditemukan
            </div>
          ) : (
            filtered.map((u) => {
              const isOpen = expandedUser === u.user;
              return (
                <div
                  key={u.user}
                  className={`user-row${isOpen ? " open" : ""}`}
                  onClick={() => setExpandedUser(isOpen ? null : u.user)}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 85px 85px 1fr 1fr",
                      gap: 10,
                      padding: "13px 14px",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Syne',sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {u.user}
                      </div>
                      <div
                        style={{ color: "#4a4f6a", fontSize: 10, marginTop: 1 }}
                      >
                        {isOpen ? "▲ tutup" : "▼ detail"}
                      </div>
                    </div>
                    <div>
                      <span className="badge badge-sick">
                        {u.sick.length} hari
                      </span>
                    </div>
                    <div>
                      <span className="badge badge-leave">
                        {u.leave.length} hari
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#fca5a5",
                        lineHeight: 1.9,
                      }}
                    >
                      {u.sick.length === 0 ? (
                        <span style={{ color: "#2a2d3a" }}>—</span>
                      ) : isOpen ? (
                        u.sick.map((d, i) => (
                          <span key={i} className="date-chip chip-sick">
                            {d}
                          </span>
                        ))
                      ) : (
                        <span>
                          {u.sick.slice(0, 2).join(", ")}
                          {u.sick.length > 2
                            ? ` +${u.sick.length - 2} lagi`
                            : ""}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#93c5fd",
                        lineHeight: 1.9,
                      }}
                    >
                      {u.leave.length === 0 ? (
                        <span style={{ color: "#2a2d3a" }}>—</span>
                      ) : isOpen ? (
                        u.leave.map((d, i) => (
                          <span key={i} className="date-chip chip-leave">
                            {d}
                          </span>
                        ))
                      ) : (
                        <span>
                          {u.leave.slice(0, 2).join(", ")}
                          {u.leave.length > 2
                            ? ` +${u.leave.length - 2} lagi`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            marginTop: 20,
            color: "#252838",
            fontSize: 10,
            borderTop: "1px solid #161926",
            paddingTop: 12,
          }}
        >
          Deteksi otomatis: work_mode → "sakit/sick" = Sakit · "cuti/leave/izin"
          = Cuti
        </div>
      </div>
    </div>
  );
}
