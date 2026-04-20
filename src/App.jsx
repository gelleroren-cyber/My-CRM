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

const STAGES = ["Neuer Lead", "In Bearbeitung", "Angebot", "Abgeschlossen ✓"];
const STAGE_COLORS = {
  "Neuer Lead":      { accent: "#4f8ef7", badge: "#1e3a5f" },
  "In Bearbeitung":    { accent: "#f7a84f", badge: "#5f3e1e" },
  "Angebot":           { accent: "#b44ff7", badge: "#3a1e5f" },
  "Abgeschlossen ✓":  { accent: "#4ff7a0", badge: "#1e5f3a" },
};

const ACTION_TYPES = ["Anruf", "E-Mail", "Meeting", "Angebot", "Follow-up", "Sonstiges"];
const ACTION_ICONS = { "Anruf": "📞", "E-Mail": "✉️", "Meeting": "🤝", "Angebot": "📄", "Follow-up": "🔔", "Sonstiges": "📌" };

const todayStr = () => new Date().toISOString().split("T")[0];
const EMPTY_CONTACT = { name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead", note: "" };

// --- Components ---

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ["#4f8ef7", "#f7a84f", "#b44ff7", "#4ff7a0"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, color: "#9090b0", fontWeight: 700 }}>{d.value}</div>
          <div style={{ width: "100%", borderRadius: "5px 5px 0 0", height: `${Math.max((d.value / max) * 58, d.value > 0 ? 4 : 0)}px`, background: colors[i % colors.length], boxShadow: `0 0 10px ${colors[i % colors.length]}44`, transition: "height 0.5s ease" }} />
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
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 6, transition: "width 0.5s ease", boxShadow: `0 0 8px ${col}44` }} />
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
    <div style={{ background: "#13132a", borderRadius: 12, padding: "16px", border: `1px solid ${color}33`, flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#d0d0e8", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: sub.includes("spät") ? "#f74f4f" : "#606080", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", flex: 1, width: "100%", maxWidth: "1000px" }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 18 }}>📊 Statistiken</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard label="Leads gesamt" value={total} color="#4f8ef7" />
        <StatCard label="Abgeschlossen" value={closed} sub={`${convRate}%`} color="#4ff7a0" />
        <StatCard label="Aufgaben" value={doneTasks} sub={`/${allTasks.length}`} color="#f7a84f" />
        <StatCard label="Offen" value={pendingActions.length} sub={overdueActions.length ? `${overdueActions.length} spät!` : null} color={overdueActions.length ? "#f74f4f" : "#b44ff7"} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ background: "#13132a", borderRadius: 12, padding: "16px", border: "1px solid #1e1e3a", flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5060a0", marginBottom: 12 }}>Nach Phase</div>
          <BarChart data={stageData} />
        </div>
        <div style={{ background: "#13132a", borderRadius: 12, padding: "16px", border: "1px solid #1e1e3a", flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5060a0", marginBottom: 12 }}>Trichter</div>
          <Funnel contacts={contacts} />
        </div>
      </div>
    </div>
  );
}

function ContactModal({ selected, tasks, actions, detailTab, setDetailTab, newTaskText, setNewTaskText, newAction, setNewAction, onClose, onUpdateStage, onUpdateField, onUpdateNote, onAddTask, onToggleTask, onDeleteTask, onAddAction, onToggleAction, onDeleteAction, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
      <div style={{ background: "#0f0f28", borderRadius: 16, border: "1px solid #1e1e3a", width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", animation: "popIn 0.18s ease" }}>

        <div style={{ padding: "14px 16px 11px", borderBottom: "1px solid #1e1e3a", background: "linear-gradient(135deg,#12122c,#15153a)", borderRadius: "16px 16px 0 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: "#6060a0", marginTop: 1 }}>{selected.company}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a4a6a", fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
          </div>
          <select value={selected.stage} onChange={e => onUpdateStage(selected, e.target.value)}
            style={{ marginTop: 9, background: "#1a1a35", border: "1px solid #2a2a4a", borderRadius: 7, color: STAGE_COLORS[selected.stage].accent, padding: "6px 10px", fontSize: 13, fontWeight: 700, width: "100%", cursor: "pointer" }}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {[["Name *", "name"], ["Unternehmen", "company"], ["Telefon", "phone"], ["E-Mail", "email"]].map(([label, field]) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>{label}</div>
                <input defaultValue={selected[field] || ""} onBlur={e => onUpdateField(field, e.target.value)}
                  style={{ width: "100%", background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#c0c0e0", padding: "8px 10px", fontSize: 15 }} />
              </div>
            ))}
            
            <div style={{ display: "flex", borderBottom: "1px solid #1a1a32", margin: "15px -16px" }}>
              {["tasks", "actions"].map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${detailTab === tab ? "#4f8ef7" : "transparent"}`, color: detailTab === tab ? "#4f8ef7" : "#4a4a6a", padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {tab === "tasks" ? "✓ Aufgaben" : "🔔 Aktionen"}
                </button>
              ))}
            </div>

            {detailTab === "tasks" ? (
              <div>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px", background: "#181832", borderRadius: 8 }}>
                    <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task)} />
                    <span style={{ flex: 1, fontSize: 13, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
                  </div>
                ))}
                <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && onAddTask()} placeholder="Neue Aufgabe..." style={{ width: "100%", background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#fff", padding: "8px" }} />
              </div>
            ) : (
              <div>
                 {actions.map(action => (
                  <div key={action.id} style={{ padding: "8px", background: "#181832", borderRadius: 8, marginBottom: 5 }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{ACTION_ICONS[action.type]} {action.type} - {action.date}</div>
                    <div style={{ fontSize: 12, color: "#a0a0c0" }}>{action.note}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
        <div style={{ padding: 16 }}>
           <button onClick={onDelete} style={{ width: "100%", background: "none", border: "1px solid #3a1a1a", color: "#f74f4f", padding: 8, borderRadius: 8, cursor: "pointer" }}>Kontakt löschen</button>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("kanban");
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [actions, setActions] = useState([]);
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);
  const [newTaskText, setNewTaskText] = useState("");
  const [newAction, setNewAction] = useState({ type: "Anruf", date: todayStr(), note: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, t, a] = await Promise.all([db.getContacts(), db.getAllTasks(), db.getAllActions()]);
      setContacts(c || []);
      setAllTasks(t || []);
      setAllActions(a || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!selected) return;
    db.getTasks(selected.id).then(t => setTasks(t || []));
    db.getActions(selected.id).then(a => setActions(a || []));
  }, [selected]);

  const filtered = contacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));
  const byStage = s => filtered.filter(c => c.stage === s);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    setSaving(true);
    const res = await db.addContact(newContact);
    setContacts(prev => [...prev, res[0]]);
    setNewContact(EMPTY_CONTACT);
    setSaving(false);
  };

  const handleUpdateContactStage = async (contact, stage) => {
    await db.updateContact(contact.id, { stage });
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, stage } : c));
  };

  const handleUpdateField = async (field, value) => {
    await db.updateContact(selected.id, { [field]: value });
    setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, [field]: value } : c));
  };

  const handleDragStart = (e, c) => { dragRef.current = c; };
  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (dragRef.current && dragRef.current.stage !== stage) {
      handleUpdateContactStage(dragRef.current, stage);
    }
    setDragOver(null);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Laden...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Mein CRM {saving && "..."}</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setPage("kanban")} style={{ background: page === "kanban" ? "#4f8ef7" : "#13132a", border: "none", color: "#fff", padding: "8px 15px", borderRadius: 8, cursor: "pointer" }}>Board</button>
          <button onClick={() => setPage("stats")} style={{ background: page === "stats" ? "#4f8ef7" : "#13132a", border: "none", color: "#fff", padding: "8px 15px", borderRadius: 8, cursor: "pointer" }}>Stats</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", overflowY: "auto" }}>
        
        {page === "kanban" && (
          <>
            {/* הטופס החדש שביקשת - Neuer Lead במרכז */}
            <div style={{ width: "100%", maxWidth: "800px", background: "#13132a", borderRadius: 16, padding: "20px", marginBottom: "30px", border: "1px solid #2a2a4a" }}>
              <h3 style={{ margin: "0 0 15px 0", fontSize: 16, color: "#4f8ef7" }}>➕ Neuer Lead</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name *" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
                <input value={newContact.company} onChange={e => setNewContact({...newContact, company: e.target.value})} placeholder="Unternehmen" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
                <button onClick={handleAddContact} style={{ background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer" }}>Lead Speichern</button>
              </div>
            </div>

            {/* הקאנבאן המאורגן */}
            <div style={{ width: "100%", maxWidth: "1200px", display: "flex", gap: 15, overflowX: "auto", paddingBottom: 20 }}>
              {STAGES.map(stage => (
                <div key={stage} onDragOver={e => { e.preventDefault(); setDragOver(stage); }} onDrop={e => handleDrop(e, stage)}
                  style={{ minWidth: "260px", background: dragOver === stage ? "#1a1a3d" : "#111126", borderRadius: 14, padding: "12px", border: "1px solid #1e1e3a" }}>
                  <div style={{ fontWeight: 700, marginBottom: 15, fontSize: 13, color: STAGE_COLORS[stage].accent }}>{stage} ({byStage(stage).length})</div>
                  {byStage(stage).map(c => (
                    <div key={c.id} draggable onDragStart={e => handleDragStart(e, c)} onClick={() => setSelected(c)}
                      style={{ background: "#181830", padding: "12px", borderRadius: 10, border: "1px solid #252545", cursor: "pointer", marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#606080" }}>{c.company}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {page === "stats" && <StatsPage contacts={contacts} allTasks={allTasks} allActions={allActions} />}
      </div>

      {selected && (
        <ContactModal 
          selected={selected} tasks={tasks} actions={actions} detailTab={detailTab} setDetailTab={setDetailTab}
          newTaskText={newTaskText} setNewTaskText={setNewTaskText} newAction={newAction} setNewAction={setNewAction}
          onClose={() => setSelected(null)} onUpdateStage={handleUpdateContactStage} onUpdateField={handleUpdateField}
          onDelete={() => { db.deleteContact(selected.id); setContacts(contacts.filter(c => c.id !== selected.id)); setSelected(null); }}
          // ... (שאר הפונקציות הנדרשות)
        />
      )}
    </div>
  );
}
