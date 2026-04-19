import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://mdslwghjxnllbvozzcjq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc2x3Z2hqeG5sbGJ2b3p6Y2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODg1MDAsImV4cCI6MjA5MDk2NDUwMH0.TA-o29kh4f3UXGdzy976VShSEZhQiutT2g4-4YO0Rms";

const api = async (path, method = "GET", body = null, extra = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
      ...extra,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (method === "DELETE" || (method === "PATCH" && res.status === 204)) return null;
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  getContacts: () => api("contacts?select=*&order=created_at.asc"),
  addContact: (c) => api("contacts", "POST", c),
  updateContact: (id, c) => api(`contacts?id=eq.${id}`, "PATCH", c),
  deleteContact: (id) => api(`contacts?id=eq.${id}`, "DELETE"),
  getTasks: (cid) => api(`tasks?contact_id=eq.${cid}&order=id.asc`),
  addTask: (t) => api("tasks", "POST", t),
  updateTask: (id, t) => api(`tasks?id=eq.${id}`, "PATCH", t),
  deleteTask: (id) => api(`tasks?id=eq.${id}`, "DELETE"),
  getActions: (cid) => api(`actions?contact_id=eq.${cid}&order=date.asc`),
  addAction: (a) => api("actions", "POST", a),
  updateAction: (id, a) => api(`actions?id=eq.${id}`, "PATCH", a),
  deleteAction: (id) => api(`actions?id=eq.${id}`, "DELETE"),
  getAllTasks: () => api("tasks?select=*"),
  getAllActions: () => api("actions?select=*"),
};

const importFromGoogleSheets = async (updateDataCallback) => {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAd1CU3UtHejY7W0ulzY6_Zuu50yvw3jMKls-DuRxK805Q9SIiTVelddc5V-UCcdmTp5kEzSUIMc7u/pub?gid=247038876&single=true&output=csv";
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const headers = lines[0].split(/[,;]/).map(h => h.trim());
    const allowedFields = ['name', 'phone', 'email', 'company', 'status', 'Antwort', 'position', 'linkedin'];
    
    let successCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(/[,;]/).map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        if (allowedFields.includes(header)) obj[header] = currentline[index] || null;
      });
      if (obj.name || obj.company) {
        try { await api("contacts", "POST", obj); successCount++; } catch (err) { console.error(err); }
      }
    }
    alert(`Import fertig! ${successCount} Kontakte geladen.`);
    if (updateDataCallback) updateDataCallback();
  } catch (error) { alert("Fehler beim Import."); }
};

const STAGES = ["Neuer Lead", "In Bearbeitung", "Angebot", "Abgeschlossen ✓"];
const STAGE_COLORS = {
  "Neuer Lead": { accent: "#4f8ef7", badge: "#1e3a5f" },
  "In Bearbeitung": { accent: "#f7a84f", badge: "#5f3e1e" },
  "Angebot": { accent: "#b44ff7", badge: "#3a1e5f" },
  "Abgeschlossen ✓": { accent: "#4ff7a0", badge: "#1e5f3a" },
};

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("kanban");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [newContact, setNewContact] = useState({ name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead" });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, t, a] = await Promise.all([db.getContacts(), db.getAllTasks(), db.getAllActions()]);
      setContacts(c || []); setAllTasks(t || []); setAllActions(a || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    const res = await db.addContact(newContact);
    if (res) { loadAll(); setShowAdd(false); setNewContact({ name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead" }); }
  };

  const filtered = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ color: "#fff", padding: 20 }}>Laden...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Mein CRM</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." style={{ background: "#16162e", border: "1px solid #2a2a4a", color: "#fff", padding: "5px 10px", borderRadius: 6 }} />
          <button onClick={() => importFromGoogleSheets(loadAll)} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>📥 Import</button>
          <button onClick={() => setShowAdd(true)} style={{ background: "#4f8ef7", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>+ Neuer</button>
        </div>
      </div>

      {/* Board */}
      <div style={{ display: "flex", gap: 15, padding: 20, overflowX: "auto" }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ minWidth: 250, background: "#13132a", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 15, color: STAGE_COLORS[stage].accent }}>{stage}</div>
            {filtered.filter(c => c.stage === stage).map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{ background: "#181830", padding: 12, borderRadius: 8, marginBottom: 10, cursor: "pointer", border: "1px solid #22223a" }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#606080" }}>{c.company}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Detail View Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#13132a", padding: 30, borderRadius: 15, width: 450, border: "1px solid #1e1e3a" }}>
            <h2 style={{ marginTop: 0 }}>{selected.name}</h2>
            <p><strong>Unternehmen:</strong> {selected.company}</p>
            <p><strong>Email:</strong> {selected.email}</p>
            <p><strong>Phone:</strong> {selected.phone}</p>
            <p><strong>Position:</strong> {selected.position || "-"}</p>
            <p><strong>LinkedIn:</strong> {selected.linkedin ? <a href={selected.linkedin} target="_blank" style={{ color: "#4f8ef7" }}>Profil</a> : "-"}</p>
            <button onClick={() => setSelected(null)} style={{ marginTop: 20, background: "#4f8ef7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>Schließen</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#13132a", padding: 25, borderRadius: 15, width: 350, border: "1px solid #1e1e3a" }}>
            <h3 style={{ marginTop: 0 }}>Neuer Kontakt</h3>
            {[["name", "Name *"], ["company", "Unternehmen"], ["phone", "Telefon"], ["email", "E-Mail"], ["position", "Position"], ["linkedin", "LinkedIn URL"]].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#5060a0" }}>{label}</div>
                <input value={newContact[field]} onChange={e => setNewContact({ ...newContact, [field]: e.target.value })}
                  style={{ width: "100%", background: "#181835", border: "1px solid #252545", color: "#fff", padding: "8px", borderRadius: 6, boxSizing: "border-box" }} />
              </div>
            ))}
            <button onClick={handleAddContact} style={{ width: "100%", background: "#4f8ef7", color: "white", border: "none", padding: 10, borderRadius: 8, marginTop: 10, cursor: "pointer" }}>Speichern</button>
            <button onClick={() => setShowAdd(false)} style={{ width: "100%", background: "none", color: "#606080", border: "none", padding: 10, cursor: "pointer" }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}
