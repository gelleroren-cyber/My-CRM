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
  getAllTasks: () => api("tasks?select=*"),
  getAllActions: () => api("actions?select=*"),
};

const STAGES = ["Neuer Lead", "In Bearbeitung", "Angebot", "Abgeschlossen ✓"];
const STAGE_COLORS = {
  "Neuer Lead":      { accent: "#4f8ef7" },
  "In Bearbeitung":    { accent: "#f7a84f" },
  "Angebot":           { accent: "#b44ff7" },
  "Abgeschlossen ✓":  { accent: "#4ff7a0" },
};

const EMPTY_CONTACT = { name: "", company: "", phone: "", email: "", position: "", linkedin: "", stage: "Neuer Lead", note: "" };

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("kanban");
  const [selected, setSelected] = useState(null);
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);
  const [dragOver, setDragOver] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    db.getContacts().then(c => { setContacts(c || []); setLoading(false); });
  }, []);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    const res = await db.addContact(newContact);
    setContacts([...contacts, res[0]]);
    setNewContact(EMPTY_CONTACT);
  };

  const handleUpdateContact = async (id, data) => {
    await db.updateContact(id, data);
    setContacts(contacts.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (dragRef.current && dragRef.current.stage !== stage) {
      handleUpdateContact(dragRef.current.id, { stage });
    }
    setDragOver(null);
  };

  if (loading) return <div style={{ background: "#0d0d1a", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Laden...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #1e1e3a", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Mein CRM</h2>
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* טופס הוספת ליד - Neuer Lead באמצע */}
        <div style={{ width: "100%", maxWidth: "900px", background: "#13132a", borderRadius: 16, padding: "20px", marginBottom: "30px", border: "1px solid #2a2a4a" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#4f8ef7" }}>➕ Neuer Lead</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name *" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <input value={newContact.company} onChange={e => setNewContact({...newContact, company: e.target.value})} placeholder="Unternehmen" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <input value={newContact.position} onChange={e => setNewContact({...newContact, position: e.target.value})} placeholder="Position" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Telefon" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="E-Mail" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <input value={newContact.linkedin} onChange={e => setNewContact({...newContact, linkedin: e.target.value})} placeholder="LinkedIn Link" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
            <textarea value={newContact.note} onChange={e => setNewContact({...newContact, note: e.target.value})} placeholder="Notizen" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px", gridColumn: "1 / -1", minHeight: "60px" }} />
            <button onClick={handleAddContact} style={{ background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: "pointer", gridColumn: "1 / -1" }}>Lead Speichern</button>
          </div>
        </div>

        {/* לוח קאנבאן */}
        <div style={{ width: "100%", maxWidth: "1300px", display: "flex", gap: 15, overflowX: "auto" }}>
          {STAGES.map(stage => (
            <div key={stage} onDragOver={e => { e.preventDefault(); setDragOver(stage); }} onDrop={e => handleDrop(e, stage)}
              style={{ minWidth: "280px", background: dragOver === stage ? "#1a1a3d" : "#111126", borderRadius: 14, padding: "12px", border: "1px solid #1e1e3a" }}>
              <div style={{ fontWeight: 700, marginBottom: 15, fontSize: 14, color: STAGE_COLORS[stage].accent }}>{stage}</div>
              {contacts.filter(c => c.stage === stage).map(c => (
                <div key={c.id} draggable onDragStart={() => { dragRef.current = c; }} onClick={() => setSelected(c)}
                  style={{ background: "#181830", padding: "12px", borderRadius: 10, border: "1px solid #252545", cursor: "pointer", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#606080" }}>{c.company}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* מודאל עריכה מלא */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#0f0f28", padding: "25px", borderRadius: 16, width: "100%", maxWidth: "500px", border: "1px solid #1e1e3a" }}>
            <h3>Bearbeiten: {selected.name}</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {["name", "company", "position", "phone", "email", "linkedin"].map(f => (
                <input key={f} defaultValue={selected[f]} onBlur={e => handleUpdateContact(selected.id, { [f]: e.target.value })} placeholder={f} style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px" }} />
              ))}
              <textarea defaultValue={selected.note} onBlur={e => handleUpdateContact(selected.id, { note: e.target.value })} placeholder="Notizen" style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", padding: "10px", minHeight: "80px" }} />
              <button onClick={() => setSelected(null)} style={{ background: "#4f8ef7", color: "#fff", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer" }}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
