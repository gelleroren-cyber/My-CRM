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
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
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
    const actions = await db.getActions(selected.id);
    setContactActions(actions);
  };

  if (loading) return <div style={{ color: "#fff", padding: 20 }}>Laden...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>Mein CRM - Übersicht</h2>
        <div style={{ background: "#16162e", padding: "10px 20px", borderRadius: 10, border: "1px solid #2a2a4a" }}>
          <strong>Offene Aufgaben: {allTasks.length}</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 15, overflowX: "auto" }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ minWidth: 280, background: "#13132a", borderRadius: 12, padding: 15 }}>
            <h4 style={{ color: "#4f8ef7", borderBottom: "1px solid #1e1e3a", pb: 10 }}>{stage}</h4>
            {contacts.filter(c => c.stage === stage).map(c => (
              <div key={c.id} onClick={() => openContact(c)} style={{ background: "#181830", padding: 12, borderRadius: 8, marginBottom: 10, cursor: "pointer", border: "1px solid #22223a" }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#606080" }}>{c.company}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#13132a", width: "800px", maxHeight: "90vh", borderRadius: 20, display: "flex", flexDirection: "column", border: "1px solid #2a2a4a", overflow: "hidden" }}>
            
            {/* Modal Header */}
            <div style={{ padding: 20, borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0 }}>{selected.name}</h2>
                <span style={{ color: "#606080" }}>{selected.company} | {selected.position}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Side: Actions/Notes */}
              <div style={{ flex: 1, padding: 20, borderRight: "1px solid #1e1e3a", overflowY: "auto" }}>
                <h4>Gesprächsnotizen & Historie</h4>
                <div style={{ display: "flex", gap: 5, marginBottom: 15 }}>
                  <input value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="Neue Notiz hinzufügen..." style={{ flex: 1, background: "#181835", border: "1px solid #252545", color: "#fff", padding: 8, borderRadius: 6 }} />
                  <button onClick={handleAddAction} style={{ background: "#4f8ef7", color: "#fff", border: "none", padding: "0 15px", borderRadius: 6, cursor: "pointer" }}>+</button>
                </div>
                {contactActions.map(a => (
                  <div key={a.id} style={{ background: "#181835", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13 }}>
                    <div style={{ color: "#5060a0", fontSize: 10, marginBottom: 4 }}>{new Date(a.date).toLocaleString()}</div>
                    {a.description}
                  </div>
                ))}
              </div>

              {/* Right Side: Tasks & Info */}
              <div style={{ width: 300, padding: 20, background: "#0d0d1f", overflowY: "auto" }}>
                <h4>Aufgaben</h4>
                {contactTasks.length === 0 && <div style={{ fontSize: 12, color: "#444" }}>Keine Aufgaben</div>}
                {contactTasks.map(t => (
                  <div key={t.id} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px solid #1e1e3a" }}>
                    ☐ {t.title}
                  </div>
                ))}
                
                <h4 style={{ marginTop: 30 }}>Kontaktinfo</h4>
                <div style={{ fontSize: 13, color: "#a0a0c0" }}>
                  <p>📞 {selected.phone}</p>
                  <p>📧 {selected.email}</p>
                  {selected.linkedin && <p>🔗 <a href={selected.linkedin} target="_blank" style={{ color: "#4f8ef7" }}>LinkedIn</a></p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
