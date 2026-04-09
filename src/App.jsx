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
    
    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(/[,;]/).map(v => v.trim());
      const obj = {};
      
      headers.forEach((header, index) => {
        if (header) obj[header] = currentline[index] || null;
      });

      try {
        // נקודה 2: אנחנו שולחים ובודקים אם ה-API מחזיר שגיאה
        const res = await api("contacts", "POST", obj);
        if (res && res.error) {
          console.error(`שגיאת Supabase בשורה ${i}:`, res.error);
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`שגיאה טכנית בשורה ${i}:`, err);
      }
    }

    alert(`סיימתי! ${successCount} לידים נוספו בהצלחה מתוך ${lines.length - 1}.`);
    if (updateDataCallback) updateDataCallback();

  } catch (error) {
    console.error("שגיאה כללית בייבוא:", error);
    alert("הייתה שגיאה במשיכת הקובץ מגוגל.");
  }
};

    alert(`סיימתי! ${successCount} לידים נוספו בהצלחה מתוך ${lines.length - 1}.`);
    
    if (updateDataCallback) {
      // טעינה מחדש של הנתונים כדי שתראה אותם על המסך
      const freshData = await api("contacts?select=*");
      updateDataCallback(freshData);
    }

  } catch (error) {
    console.error("שגיאה כללית בייבוא:", error);
    alert("הייתה שגיאה במשיכת הקובץ מגוגל.");
  }
};
      });

      if (Object.keys(obj).length > 0) {
        result.push(obj);
      }
    }

    console.log("נתונים מוכנים לשליחה:", result);

    // שליחה אחת-אחת כדי למנוע קריסה של הכל בגלל שורה אחת
    for (const item of result) {
      await api("contacts", "POST", item);
    }

    alert(`הצלחנו! ${result.length} אנשי קשר נוספו למערכת.`);
    if (updateDataCallback) updateDataCallback();

  } catch (error) {
    console.error("שגיאה בייבוא:", error);
    alert("הייתה שגיאה בחיבור ל-Supabase. בדוק את ה-Console.");
  }
};


    // שליחת הנתונים ל-Database
    for (const item of result) {
      try {
        // אנחנו משתמשים בפונקציה שכבר קיימת אצלך ב-API
        await api("contacts", "POST", item); 
      } catch (err) {
        console.error("שגיאה בהוספת שורה:", item, err);
      }
    }

    alert(`סיימתי! ${result.length} שורות הועלו בהצלחה ל-CRM.`);
    
    // אם יש לך פונקציה שמעדכנת את התצוגה, נפעיל אותה כאן
    if (updateDataCallback) updateDataCallback(result);

  } catch (error) {
    console.error("שגיאה בייבוא:", error);
    alert("שגיאה במשיכת הנתונים. וודא שהטבלה פורסמה כ-CSV.");
  }
};

const STAGES = ["Neuer Lead", "In Bearbeitung", "Angebot", "Abgeschlossen ✓"];
const STAGE_COLORS = {
  "Neuer Lead":         { accent: "#4f8ef7", badge: "#1e3a5f" },
  "In Bearbeitung":     { accent: "#f7a84f", badge: "#5f3e1e" },
  "Angebot":            { accent: "#b44ff7", badge: "#3a1e5f" },
  "Abgeschlossen ✓":   { accent: "#4ff7a0", badge: "#1e5f3a" },
};

const ACTION_TYPES = ["Anruf", "E-Mail", "Meeting", "Angebot", "Follow-up", "Sonstiges"];
const ACTION_ICONS = { "Anruf": "📞", "E-Mail": "✉️", "Meeting": "🤝", "Angebot": "📄", "Follow-up": "🔔", "Sonstiges": "📌" };

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Bar Chart ──────────────────────────────────────────────────────────────
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
    <div style={{ background: "#13132a", borderRadius: 12, padding: "18px 20px", border: `1px solid ${color}33`, boxShadow: `0 0 20px ${color}0d`, flex: 1, minWidth: 110 }}>
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
      {overdueActions.length > 0 && (
        <div style={{ background: "#180e0e", borderRadius: 12, padding: "18px", border: "1px solid #3a1a1a", marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f74f4f", marginBottom: 14 }}>⚠️ Überfällige Aktionen ({overdueActions.length})</div>
          {overdueActions.map(a => {
            const contact = contacts.find(c => c.id === a.contact_id);
            const daysLate = Math.ceil((now - new Date(a.date)) / 86400000);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #2a1010" }}>
                <span style={{ fontSize: 16 }}>{ACTION_ICONS[a.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#e0a0a0" }}>{a.note || a.type}</div>
                  <div style={{ fontSize: 10, color: "#804040" }}>{contact?.name} · {a.date}</div>
                </div>
                <div style={{ fontSize: 10, color: "#f74f4f", fontWeight: 800, background: "#2a1010", borderRadius: 8, padding: "2px 8px" }}>+{daysLate}T</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ background: "#13132a", borderRadius: 12, padding: "18px", border: "1px solid #1e1e3a" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#5060a0", marginBottom: 14 }}>⏰ Bevorstehende Aktionen</div>
        {upcomingActions.length === 0
          ? <div style={{ color: "#3a3a5a", fontSize: 12 }}>Keine bevorstehenden Aktionen geplant</div>
          : upcomingActions.map(a => {
            const daysLeft = Math.ceil((new Date(a.date) - now) / 86400000);
            const urgent = daysLeft <= 2;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #1a1a32" }}>
                <span style={{ fontSize: 16 }}>{ACTION_ICONS[a.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#d0d0f0" }}>{a.note || a.type}</div>
                  <div style={{ fontSize: 10, color: "#606080" }}>{a.contactName} · {a.date}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: urgent ? "#2a1a10" : "#1a1a35", color: urgent ? "#f7a84f" : "#6070a0" }}>
                  {daysLeft === 0 ? "Heute" : daysLeft === 1 ? "Morgen" : `in ${daysLeft}T`}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
  const [newContact, setNewContact] = useState({ name: "", company: "", phone: "", email: "", stage: "Neuer Lead", note: "" });
  const [newTaskText, setNewTaskText] = useState("");
  const [newAction, setNewAction] = useState({ type: "Anruf", date: todayStr(), note: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  // Load all data
  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, t, a] = await Promise.all([db.getContacts(), db.getAllTasks(), db.getAllActions()]);
      setContacts(c || []);
      setAllTasks(t || []);
      setAllActions(a || []);
    } catch (e) {
      setError("Verbindungsfehler: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Load tasks+actions when contact selected
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
    setContacts(prev => [...prev, res[0]]);
    setNewContact({ name: "", company: "", phone: "", email: "", stage: "Neuer Lead", note: "" });
    setShowAdd(false);
  });

  const handleUpdateContactStage = (contact, stage) => withSave(async () => {
    await db.updateContact(contact.id, { stage });
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, stage } : c));
    if (selected?.id === contact.id) setSelected(prev => ({ ...prev, stage }));
  });

  const handleUpdateNote = (note) => withSave(async () => {
    await db.updateContact(selected.id, { note });
    setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, note } : c));
    setSelected(prev => ({ ...prev, note }));
  });

  const handleDeleteContact = () => withSave(async () => {
    await db.deleteContact(selected.id);
    setContacts(prev => prev.filter(c => c.id !== selected.id));
    setAllTasks(prev => prev.filter(t => t.contact_id !== selected.id));
    setAllActions(prev => prev.filter(a => a.contact_id !== selected.id));
    setSelected(null);
  });

  const handleAddTask = () => withSave(async () => {
    if (!newTaskText.trim()) return;
    const res = await db.addTask({ contact_id: selected.id, text: newTaskText, done: false });
    const t = res[0];
    setTasks(prev => [...prev, t]);
    setAllTasks(prev => [...prev, t]);
    setNewTaskText("");
  });

  const handleToggleTask = (task) => withSave(async () => {
    await db.updateTask(task.id, { done: !task.done });
    const upd = t => t.id === task.id ? { ...t, done: !t.done } : t;
    setTasks(prev => prev.map(upd));
    setAllTasks(prev => prev.map(upd));
  });

  const handleDeleteTask = (id) => withSave(async () => {
    await db.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setAllTasks(prev => prev.filter(t => t.id !== id));
  });

  const handleAddAction = () => withSave(async () => {
    if (!newAction.date) return;
    const res = await db.addAction({ contact_id: selected.id, ...newAction, done: false });
    const a = res[0];
    setActions(prev => [...prev, a]);
    setAllActions(prev => [...prev, a]);
    setNewAction({ type: "Anruf", date: todayStr(), note: "" });
  });

  const handleToggleAction = (action) => withSave(async () => {
    await db.updateAction(action.id, { done: !action.done });
    const upd = a => a.id === action.id ? { ...a, done: !a.done } : a;
    setActions(prev => prev.map(upd));
    setAllActions(prev => prev.map(upd));
  });

  const handleDeleteAction = (id) => withSave(async () => {
    await db.deleteAction(id);
    setActions(prev => prev.filter(a => a.id !== id));
    setAllActions(prev => prev.filter(a => a.id !== id));
  });

  const handleDragStart = (e, c) => { setDragging(c); dragRef.current = c; e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.stage === stage) { setDragging(null); setDragOver(null); dragRef.current = null; return; }
    handleUpdateContactStage(dragRef.current, stage);
    setDragging(null); setDragOver(null); dragRef.current = null;
  };

  const overdueCount = allActions.filter(a => !a.done && new Date(a.date) < new Date()).length;
  const contactTasks = tasks;
  const contactActions = actions;

  const inp = (val, onChange, placeholder, extra = {}) => (
    <input value={val} onChange={onChange} placeholder={placeholder}
      style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e0e0f0", padding: "6px 10px", fontSize: 11, outline: "none", ...extra }} />
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #1e1e3a", borderTop: "3px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#4a4a6a", fontSize: 13 }}>Verbindung zu Supabase...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: "#f74f4f", fontSize: 13 }}>{error}</div>
      <button onClick={loadAll} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 8, color: "#4f8ef7", padding: "8px 20px", cursor: "pointer", fontSize: 12 }}>Erneut versuchen</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "'Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}} input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}`}</style>

      {/* Header */}
      <div style={{ padding: "13px 22px", background: "#0d0d1a", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#4f8ef7,#b44ff7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", boxShadow: "0 0 14px rgba(79,142,247,0.35)" }}>C</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Mein CRM</div>
            <div style={{ fontSize: 9, color: "#4a4a6a", display: "flex", alignItems: "center", gap: 5 }}>
              {contacts.length} Kontakte
              {saving && <span style={{ color: "#4f8ef7" }}>· Speichert...</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, background: "#13132a", borderRadius: 9, padding: 3 }}>
          {[["kanban", "🗂 Board"], ["stats", "📊 Statistiken"]].map(([p, label]) => (
            <button key={p} onClick={() => setPage(p)} style={{ position: "relative", background: page === p ? "linear-gradient(135deg,#4f8ef7,#3a6fd8)" : "none", border: "none", borderRadius: 7, color: page === p ? "#fff" : "#5a5a7a", padding: "6px 15px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {label}
              {p === "stats" && overdueCount > 0 && <span style={{ position: "absolute", top: 1, right: 3, background: "#f74f4f", borderRadius: 10, fontSize: 8, fontWeight: 900, color: "#fff", padding: "1px 4px" }}>{overdueCount}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {page === "kanban" && inp(search, e => setSearch(e.target.value), "🔍 Suchen...", { width: 150 })}
          <button 
  onClick={() => importFromGoogleSheets(db.addContact)}
  style={{ 
    background: '#22c55e', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    padding: '4px 12px', 
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}
>
  <span>📥</span> Import
</button>
          <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#4f8ef7,#3a6fd8)", border: "none", borderRadius: 8, color: "#fff", padding: "7px 15px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Neuer Kontakt</button>
        </div>
      </div>

      {/* Pages */}
      {page === "stats" ? (
        <StatsPage contacts={contacts} allTasks={allTasks} allActions={allActions} />
      ) : (
        <div style={{ display: "flex", gap: 12, padding: "18px 18px 0", overflowX: "auto", flex: 1 }}>
          {STAGES.map(stage => {
            const col = STAGE_COLORS[stage];
            const cards = byStage(stage);
            const isOver = dragOver === stage;
            return (
              <div key={stage}
                onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, stage)}
                style={{ minWidth: 220, width: 220, flexShrink: 0, background: isOver ? "#1a1a35" : "#13132a", borderRadius: 13, border: `1.5px solid ${isOver ? col.accent : "#1e1e3a"}`, transition: "all 0.2s", padding: "0 0 10px", maxHeight: "calc(100vh - 115px)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 13px 9px", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: col.accent }}>{stage}</span>
                  <span style={{ background: col.badge, color: col.accent, borderRadius: 20, fontSize: 9, fontWeight: 700, padding: "2px 7px" }}>{cards.length}</span>
                </div>
                <div style={{ overflowY: "auto", padding: "8px 8px 0", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  {cards.map(contact => {
                    const cTasks = allTasks.filter(t => t.contact_id === contact.id);
                    const cActions = allActions.filter(a => a.contact_id === contact.id);
                    const pendActs = cActions.filter(a => !a.done).length;
                    const overActs = cActions.filter(a => !a.done && new Date(a.date) < new Date()).length;
                    return (
                      <div key={contact.id} draggable
                        onDragStart={e => handleDragStart(e, contact)}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        onClick={() => { setSelected(contact); setDetailTab("tasks"); }}
                        style={{ background: selected?.id === contact.id ? "#1e1e40" : "#181830", borderRadius: 9, border: `1px solid ${selected?.id === contact.id ? col.accent : "#22223a"}`, padding: "9px 11px", cursor: "pointer", transition: "all 0.15s", opacity: dragging?.id === contact.id ? 0.4 : 1, boxShadow: selected?.id === contact.id ? `0 0 12px ${col.accent}20` : "none" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#f0f0ff", marginBottom: 2 }}>{contact.name}</div>
                        <div style={{ fontSize: 10, color: "#606080", marginBottom: 5 }}>{contact.company}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {cTasks.length > 0 && <span style={{ fontSize: 9, background: "#1e1e3a", color: "#6070a0", borderRadius: 5, padding: "2px 6px" }}>✓ {cTasks.filter(t => t.done).length}/{cTasks.length}</span>}
                          {pendActs > 0 && <span style={{ fontSize: 9, background: overActs ? "#2a1010" : "#1a2035", color: overActs ? "#f74f4f" : "#4f8ef7", borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{overActs ? `⚠️ ${overActs}` : `🔔 ${pendActs}`}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <div style={{ textAlign: "center", color: "#252540", fontSize: 10, padding: "14px 0" }}>Hierher ziehen</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "#0f0f28", borderLeft: "1px solid #1e1e3a", display: "flex", flexDirection: "column", boxShadow: "4px 0 40px rgba(0,0,0,0.6)", zIndex: 100, animation: "slideIn 0.2s ease" }}>
          <div style={{ padding: "15px 15px 11px", borderBottom: "1px solid #1e1e3a", background: "linear-gradient(135deg,#12122c,#15153a)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: "#6060a0", marginTop: 1 }}>{selected.company}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#4a4a6a", fontSize: 17, cursor: "pointer" }}>✕</button>
            </div>
            <select value={selected.stage} onChange={e => handleUpdateContactStage(selected, e.target.value)}
              style={{ marginTop: 9, background: "#1a1a35", border: "1px solid #2a2a4a", borderRadius: 7, color: STAGE_COLORS[selected.stage].accent, padding: "5px 9px", fontSize: 11, fontWeight: 700, width: "100%", outline: "none", cursor: "pointer" }}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ padding: "11px 15px", borderBottom: "1px solid #1a1a32" }}>
            {[["📞", selected.phone], ["✉️", selected.email]].map(([icon, val]) => (
              <div key={icon} style={{ display: "flex", gap: 7, marginBottom: 5, fontSize: 11, color: "#9090b0" }}><span>{icon}</span><span>{val}</span></div>
            ))}
            <textarea defaultValue={selected.note} onBlur={e => handleUpdateNote(e.target.value)} placeholder="Notiz hinzufügen..." rows={2}
              style={{ width: "100%", marginTop: 6, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#c0c0e0", padding: "6px 9px", fontSize: 11, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid #1a1a32" }}>
            {[["tasks", "✓ Aufgaben"], ["actions", "🔔 Aktionen"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setDetailTab(tab)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${detailTab === tab ? "#4f8ef7" : "transparent"}`, color: detailTab === tab ? "#4f8ef7" : "#4a4a6a", padding: "9px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "11px 14px" }}>
            {detailTab === "tasks" ? (
              <>
                {contactTasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, padding: "7px 9px", background: "#181832", borderRadius: 8, border: "1px solid #22223a" }}>
                    <input type="checkbox" checked={task.done} onChange={() => handleToggleTask(task)} style={{ cursor: "pointer", accentColor: "#4ff7a0" }} />
                    <span style={{ flex: 1, fontSize: 11, color: task.done ? "#3a3a5a" : "#d0d0f0", textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ background: "none", border: "none", color: "#2e2e4e", cursor: "pointer", fontSize: 13 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                  {inp(newTaskText, e => setNewTaskText(e.target.value), "Neue Aufgabe...", { flex: 1, onKeyDown: e => e.key === "Enter" && handleAddTask() })}
                  <button onClick={handleAddTask} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 7, color: "#4f8ef7", padding: "6px 11px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
                </div>
              </>
            ) : (
              <>
                {contactActions.map(action => {
                  const isOverdue = !action.done && new Date(action.date) < new Date();
                  return (
                    <div key={action.id} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7, padding: "8px 9px", background: isOverdue ? "#180e0e" : "#181832", borderRadius: 9, border: `1px solid ${isOverdue ? "#3a1010" : "#22223a"}` }}>
                      <input type="checkbox" checked={action.done} onChange={() => handleToggleAction(action)} style={{ cursor: "pointer", accentColor: "#4ff7a0", marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <span style={{ fontSize: 12 }}>{ACTION_ICONS[action.type]}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isOverdue ? "#f74f4f" : "#c0c0e0" }}>{action.type}</span>
                          <span style={{ fontSize: 9, color: "#4a4a6a", marginLeft: "auto" }}>{action.date}</span>
                        </div>
                        {action.note && <div style={{ fontSize: 10, color: "#6060a0" }}>{action.note}</div>}
                      </div>
                      <button onClick={() => handleDeleteAction(action.id)} style={{ background: "none", border: "none", color: "#2e2e4e", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  );
                })}
                <div style={{ background: "#13132e", borderRadius: 9, padding: "10px", border: "1px solid #252545", marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: "#4a4a7a", marginBottom: 7, fontWeight: 700, letterSpacing: 0.5 }}>+ NEUE AKTION</div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <select value={newAction.type} onChange={e => setNewAction(p => ({ ...p, type: e.target.value }))}
                      style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 6, color: "#e0e0f0", padding: "5px 7px", fontSize: 10, outline: "none" }}>
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_ICONS[t]} {t}</option>)}
                    </select>
                    <input type="date" value={newAction.date} onChange={e => setNewAction(p => ({ ...p, date: e.target.value }))}
                      style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 6, color: "#e0e0f0", padding: "5px 6px", fontSize: 10, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {inp(newAction.note, e => setNewAction(p => ({ ...p, note: e.target.value })), "Notiz (optional)...", { flex: 1, fontSize: 10, onKeyDown: e => e.key === "Enter" && handleAddAction() })}
                    <button onClick={handleAddAction} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 6, color: "#4f8ef7", padding: "5px 10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ padding: "11px 14px", borderTop: "1px solid #1a1a32" }}>
            <button onClick={handleDeleteContact} style={{ width: "100%", background: "none", border: "1px solid #2a1010", borderRadius: 8, color: "#f74f4f", padding: "8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🗑 Kontakt löschen</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#12122c", borderRadius: 16, padding: "24px 24px 20px", width: 330, border: "1px solid #252545", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 18, color: "#fff" }}>Neuer Kontakt</div>
            {[["name", "Name *"], ["company", "Unternehmen"], ["phone", "Telefon"], ["email", "E-Mail"]].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>{label}</div>
                <input value={newContact[field]} onChange={e => setNewContact(prev => ({ ...prev, [field]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleAddContact()}
                  style={{ width: "100%", background: "#181835", border: "1px solid #252545", borderRadius: 8, color: "#e0e0f0", padding: "7px 11px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>Phase</div>
              <select value={newContact.stage} onChange={e => setNewContact(prev => ({ ...prev, stage: e.target.value }))}
                style={{ width: "100%", background: "#181835", border: "1px solid #252545", borderRadius: 8, color: "#e0e0f0", padding: "7px 11px", fontSize: 12, outline: "none" }}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddContact} style={{ flex: 1, background: "linear-gradient(135deg,#4f8ef7,#3a6fd8)", border: "none", borderRadius: 9, color: "#fff", padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Hinzufügen</button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "none", border: "1px solid #252545", borderRadius: 9, color: "#6060a0", padding: "9px", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
