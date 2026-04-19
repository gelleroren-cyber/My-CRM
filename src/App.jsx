import { useState, useEffect } from "react";

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
  getContacts: () => api("contacts?select=*&order=created_at.desc"),
  updateContact: (id, c) => api(`contacts?id=eq.${id}`, "PATCH", c),
  getTasks: (cid) => api(`tasks?contact_id=eq.${cid}&order=id.asc`),
  addTask: (t) => api("tasks", "POST", t),
  updateTask: (id, t) => api(`tasks?id=eq.${id}`, "PATCH", t),
  deleteTask: (id) => api(`tasks?id=eq.${id}`, "DELETE"),
  getActions: (cid) => api(`actions?contact_id=eq.${cid}&order=date.desc`),
  addAction: (a) => api("actions", "POST", a),
  getAllTasks: () => api("tasks?select=*"),
};

const STAGES = ["Neuer Lead", "In Bearbeitung", "Angebot", "Abgeschlossen ✓"];

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [contactTasks, setContactTasks] = useState([]);
  const [contactActions, setContactActions] = useState([]);
  const [newAction, setNewAction] = useState("");
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [c, t] = await Promise.all([db.getContacts(), db.getAllTasks()]);
      setContacts(c || []);
      setAllTasks(t || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openContact = async (contact) => {
    setSelected(contact);
    const [tasks, actions] = await Promise.all([db.getTasks(contact.id), db.getActions(contact.id)]);
    setContactTasks(tasks || []);
    setContactActions(actions || []);
  };

  const handleAddAction = async () => {
    if (!newAction.trim()) return;
    const action = { contact_id: selected.id, type: "Notiz", description: newAction, date: new Date().toISOString() };
    await db.addAction(action);
    setNewAction("");
    setContactActions(await db.getActions(selected.id));
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await db.addTask({ contact_id: selected.id, title: newTask, completed: false });
    setNewTask("");
    setContactTasks(await db.getTasks(selected.id));
    loadData(); // Update general task count
  };

  const toggleTask = async (task) => {
    await db.updateTask(task.id, { completed: !task.completed });
    setContactTasks(await db.getTasks(selected.id));
    loadData();
  };

  const updateStage = async (id, newStage) => {
    await db.updateContact(id, { stage: newStage });
    if (selected && selected.id === id) setSelected({...selected, stage: newStage});
    loadData();
  };

  if (loading) return <div style={{ background: "#0d0d1a", height: "100vh", color: "#fff", padding: 40 }}>Daten werden geladen...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif" }}>
      {/* Dashboard Header */}
      <div style={{ padding: "20px 30px", background: "#111126", borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Oren's CRM</h1>
          <div style={{ fontSize: 13, color: "#606080" }}>{contacts.length} Kontakte | {allTasks.filter(t => !t.completed).length} offene Aufgaben</div>
        </div>
        <div style={{ display: "flex", gap: 15 }}>
           {/* Summary Stats */}
           <div style={{ background: "#1a1a35", padding: "10px 15px", borderRadius: 10, border: "1px solid #2a2a4a", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#4f8ef7", textTransform: "uppercase" }}>Offene Tasks</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{allTasks.filter(t => !t.completed).length}</div>
           </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: "flex", gap: 20, padding: 25, overflowX: "auto", alignItems: "flex-start" }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ minWidth: 300, background: "#13132a", borderRadius: 15, padding: 15, border: "1px solid #1e1e3a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, borderBottom: "2px solid #1e1e3a", pb: 10 }}>
              <span style={{ fontWeight: 700, color: "#fff" }}>{stage}</span>
              <span style={{ background: "#1e1e3a", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                {contacts.filter(c => c.stage === stage).length}
              </span>
            </div>
            {contacts.filter(c => c.stage === stage).map(c => (
              <div key={c.id} onClick={() => openContact(c)} style={{ background: "#181830", padding: 15, borderRadius: 10, marginBottom: 12, cursor: "pointer", border: "1px solid #252545", transition: "0.2s" }}>
                <div style={{ fontWeight: 700, marginBottom: 5 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#606080" }}>{c.company}</div>
                {allTasks.some(t => t.contact_id === c.id && !t.completed) && (
                  <div style={{ marginTop: 10, fontSize: 10, color: "#f7a84f", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, background: "#f7a84f", borderRadius: "50%" }}></span> Task offen
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal View - הכל כאן בחזרה */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#13132a", width: "1000px", maxWidth: "100%", height: "85vh", borderRadius: 24, display: "flex", flexDirection: "column", border: "1px solid #2a2a4a", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            
            {/* Header */}
            <div style={{ padding: "25px 30px", borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 28 }}>{selected.name}</h2>
                <div style={{ color: "#4f8ef7", marginTop: 5 }}>{selected.company} • {selected.position || "Keine Position"}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select value={selected.stage} onChange={(e) => updateStage(selected.id, e.target.value)} style={{ background: "#1a1a35", color: "#fff", border: "1px solid #2a2a4a", padding: "8px 12px", borderRadius: 8 }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setSelected(null)} style={{ background: "#2a2a4a", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20 }}>×</button>
              </div>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Column: Timeline/Actions */}
              <div style={{ flex: 1, padding: 30, overflowY: "auto", borderRight: "1px solid #1e1e3a" }}>
                <h3 style={{ fontSize: 16, marginBottom: 20, color: "#fff" }}>Gesprächsnotizen & Historie</h3>
                
                <div style={{ display: "flex", gap: 10, marginBottom: 25 }}>
                  <textarea value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="Was wurde besprochen?" style={{ flex: 1, background: "#181835", border: "1px solid #252545", color: "#fff", padding: 12, borderRadius: 10, resize: "none", height: 60 }} />
                  <button onClick={handleAddAction} style={{ background: "#4f8ef7", color: "#fff", border: "none", padding: "0 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Senden</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {contactActions.map(a => (
                    <div key={a.id} style={{ background: "#1a1a35", padding: 15, borderRadius: 12, border: "1px solid #222240" }}>
                      <div style={{ fontSize: 11, color: "#5060a0", marginBottom: 8 }}>{new Date(a.date).toLocaleString('de-DE')}</div>
                      <div style={{ lineHeight: "1.5", fontSize: 14 }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Info & Tasks */}
              <div style={{ width: 350, background: "#0d0d1f", padding: 30, overflowY: "auto" }}>
                <div style={{ marginBottom: 40 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 20, color: "#fff" }}>Aufgaben</h3>
                  <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Neue Aufgabe..." style={{ flex: 1, background: "#181835", border: "1px solid #252545", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 13 }} />
                    <button onClick={handleAddTask} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "0 12px", borderRadius: 8, cursor: "pointer" }}>+</button>
                  </div>
                  {contactTasks.map(t => (
                    <div key={t.id} onClick={() => toggleTask(t)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #1e1e3a", cursor: "pointer", opacity: t.completed ? 0.5 : 1 }}>
                      <div style={{ width: 18, height: 18, border: "2px solid #4f8ef7", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: t.completed ? "#4f8ef7" : "transparent" }}>
                        {t.completed && "✓"}
                      </div>
                      <span style={{ fontSize: 14, textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</span>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: 16, marginBottom: 20, color: "#fff" }}>Kontaktdaten</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                  <div style={{ color: "#a0a0c0" }}>📞 {selected.phone || "Keine Nummer"}</div>
                  <div style={{ color: "#a0a0c0" }}>📧 {selected.email || "Keine Email"}</div>
                  {selected.linkedin && (
                    <a href={selected.linkedin} target="_blank" rel="noreferrer" style={{ color: "#4f8ef7", textDecoration: "none" }}>🔗 LinkedIn Profil</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
