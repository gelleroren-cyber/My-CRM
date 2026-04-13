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
        if (allowedFields.includes(header)) {
          obj[header] = currentline[index] || null;
        }
      });
      if (obj.name || obj.company) {
        try {
          await api("contacts", "POST", obj);
          successCount++;
        } catch (err) { console.error("Fehler Zeile " + i); }
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

const ACTION_TYPES = ["Anruf", "E-Mail", "Meeting", "Angebot", "Follow-up", "Sonstiges"];
const ACTION_ICONS = { "Anruf": "📞", "E-Mail": "✉️", "Meeting": "🤝", "Angebot": "📄", "Follow-up": "🔔", "Sonstiges": "📌" };

const todayStr = () => new Date().toISOString().split("T")[0];

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ["#4f8ef7", "#f7a84f", "#b44ff7", "#4ff7a0"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#9090b0", fontWeight: 700 }}>{d.value}</div>
          <div style={{ width: "100%", borderRadius: "5px 5px 0 0", height: `${Math.max((d.value / max) * 58, d.value > 0 ? 4 : 0)}px`, background: colors[i % colors.length], transition: "height 0.5s ease" }} />
          <div style={{ fontSize: 9, color: "#5a5a7a", textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function Funnel({ contacts }) {
  const total = contacts.length || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {STAGES.map(stage => {
        const count = contacts.filter(c => c.stage === stage).length;
        const pct = Math.round((count / total) * 100);
        const col = STAGE_COLORS[stage].accent;
        return (
          <div key={stage}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a0a0c0", marginBottom: 4 }}>
              <span>{stage}</span><span style={{ color: col, fontWeight: 700 }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height: 10, background: "#1e1e3a", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 6, transition: "width 0.5s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsPage({ contacts, allTasks, allActions }) {
  const now = new Date();
  const total = contacts.length;
  const closed = contacts.filter(c => c.stage === "Abgeschlossen ✓").length;
  const convRate = total ? Math.round((closed / total) * 100) : 0;
  const doneTasks = allTasks.filter(t => t.done).length;
  const pendingActions = allActions.filter(a => !a.done);
  const overdueActions = pendingActions.filter(a => new Date(a.date) < now);
  const upcomingActions = pendingActions
    .filter(a => new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6)
    .map(a => ({ ...a, contactName: contacts.find(c => c.id === a.contact_id)?.name || "?" }));

  const stageData = STAGES.map(s => ({ label: s.replace(" ✓", ""), value: contacts.filter(c => c.stage === s).length }));

  const StatCard = ({ label, value, sub, color }) => (
    <div style={{ background: "#13132a", borderRadius: 12, padding: "18px 20px", border: `1px solid ${color}33`, flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#d0d0e8", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: sub.includes("Verzug") ? "#f74f4f" : "#606080", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: "28px", overflowY: "auto", flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 24 }}>📊 Statistiken</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Leads gesamt" value={total} color="#4f8ef7" />
        <StatCard label="Abgeschlossen" value={closed} sub={`${convRate}% Quote`} color="#4ff7a0" />
        <StatCard label="Aufgaben erledigt" value={doneTasks} sub={`von ${allTasks.length}`} color="#f7a84f" />
        <StatCard label="Aktionen offen" value={pendingActions.length} sub={overdueActions.length ? `${overdueActions.length} im Verzug!` : null} color={overdueActions.length ? "#f74f4f" : "#b44ff7"} />
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "#13132a", borderRadius: 12, padding: "20px", border: "1px solid #1e1e3a", flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5060a0", marginBottom: 16 }}>Leads nach Phase</div>
          <BarChart data={stageData} />
        </div>
        <div style={{ background: "#13132a", borderRadius: 12, padding: "20px", border: "1px solid #1e1e3a", flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5060a0", marginBottom: 16 }}>Verkaufstrichter</div>
          <Funnel contacts={contacts} />
        </div>
      </div>
    </div>
  );
}

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState("kanban");
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [actions, setActions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead", note: "" });
  const [newTaskText, setNewTaskText] = useState("");
  const [newAction, setNewAction] = useState({ type: "Anruf", date: todayStr(), note: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, t, a] = await Promise.all([db.getContacts(), db.getAllTasks(), db.getAllActions()]);
      setContacts(c || []);
      setAllTasks(t || []);
      setAllActions(a || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!selected) return;
    db.getTasks(selected.id).then(t => setTasks(t || []));
    db.getActions(selected.id).then(a => setActions(a || []));
  }, [selected]);

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const byStage = s => filtered.filter(c => c.stage === s);

  const withSave = async (fn) => { setSaving(true); try { await fn(); } finally { setSaving(false); } };

  const handleAddContact = () => withSave(async () => {
    if (!newContact.name.trim()) return;
    const res = await db.addContact(newContact);
    if (res) {
      setContacts(prev => [...prev, res[0]]);
      setNewContact({ name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead", note: "" });
      setShowAdd(false);
    }
  });

  const handleUpdateContactStage = (contact, stage) => withSave(async () => {
    await db.updateContact(contact.id, { stage });
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, stage } : c));
  });

  const handleDragStart = (e, c) => { setDragging(c); dragRef.current = c; };
  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (dragRef.current) handleUpdateContactStage(dragRef.current, stage);
    setDragging(null); setDragOver(null);
  };

  if (loading) return <div style={{ color: "#fff", padding: 20 }}>Laden...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "13px 22px", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Mein CRM</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setPage("kanban")} style={{ background: page === "kanban" ? "#4f8ef7" : "none", color: "#fff", border: "none", padding: "5px 10px", cursor: "pointer" }}>Board</button>
          <button onClick={() => setPage("stats")} style={{ background: page === "stats" ? "#4f8ef7" : "none", color: "#fff", border: "none", padding: "5px 10px", cursor: "pointer" }}>Stats</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." style={{ background: "#16162e", border: "1px solid #2a2a4a", color: "#fff", padding: "5px" }} />
          <button onClick={() => importFromGoogleSheets(loadAll)} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>📥 Import</button>
          <button onClick={() => setShowAdd(true)} style={{ background: "#4f8ef7", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>+ Neuer Kontakt</button>
        </div>
      </div>

      {/* Content */}
      {page === "stats" ? <StatsPage contacts={contacts} allTasks={allTasks} allActions={allActions} /> : (
        <div style={{ display: "flex", gap: 12, padding: 18, overflowX: "auto", flex: 1 }}>
          {STAGES.map(stage => (
            <div key={stage} onDragOver={e => { e.preventDefault(); setDragOver(stage); }} onDrop={e => handleDrop(e, stage)}
              style={{ minWidth: 250, background: dragOver === stage ? "#1a1a35" : "#13132a", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: STAGE_COLORS[stage].accent }}>{stage} ({byStage(stage).length})</div>
              {byStage(stage).map(c => (
                <div key={c.id} draggable onDragStart={e => handleDragStart(e, c)} onClick={() => setSelected(c)}
                  style={{ background: "#181830", padding: 10, borderRadius: 8, marginBottom: 8, cursor: "pointer", border: "1px solid #22223a" }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#606080" }}>{c.company}</div>
                </div>
              ))}
            </div>
          ))}
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
                  style={{ width: "100%", background: "#181835", border: "1px solid #252545", color: "#fff", padding: "8px", borderRadius: 6 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleAddContact} style={{ flex: 1, background: "#4f8ef7", color: "#fff", border: "none", padding: 10, borderRadius: 8 }}>Speichern</button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "#1e1e3a", color: "#fff", border: "none", padding: 10, borderRadius: 8 }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
