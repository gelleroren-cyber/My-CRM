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
  "Neuer Lead":        { accent: "#4f8ef7", badge: "#1e3a5f" },
  "In Bearbeitung":    { accent: "#f7a84f", badge: "#5f3e1e" },
  "Angebot":           { accent: "#b44ff7", badge: "#3a1e5f" },
  "Abgeschlossen ✓":  { accent: "#4ff7a0", badge: "#1e5f3a" },
};

const ACTION_TYPES = ["Anruf", "E-Mail", "Meeting", "Angebot", "Follow-up", "Sonstiges"];
const ACTION_ICONS = { "Anruf": "📞", "E-Mail": "✉️", "Meeting": "🤝", "Angebot": "📄", "Follow-up": "🔔", "Sonstiges": "📌" };

const todayStr = () => new Date().toISOString().split("T")[0];
const EMPTY_CONTACT = { company: "", name: "", phone: "", phone2: "", email: "", position: "", linkedin: "", website: "", stage: "Neuer Lead", note: "" };

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
    <div style={{ padding: "20px 16px", overflowY: "auto", flex: 1 }}>
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
      {overdueActions.length > 0 && (
        <div style={{ background: "#180e0e", borderRadius: 12, padding: "16px", border: "1px solid #3a1a1a", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f74f4f", marginBottom: 12 }}>⚠️ Überfällig ({overdueActions.length})</div>
          {overdueActions.map(a => {
            const contact = contacts.find(c => c.id === a.contact_id);
            const daysLate = Math.ceil((now - new Date(a.date)) / 86400000);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #2a1010" }}>
                <span>{ACTION_ICONS[a.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#e0a0a0" }}>{a.note || a.type}</div>
                  <div style={{ fontSize: 10, color: "#804040" }}>{contact?.name} · {a.date}</div>
                </div>
                <div style={{ fontSize: 10, color: "#f74f4f", fontWeight: 800, background: "#2a1010", borderRadius: 8, padding: "2px 7px" }}>+{daysLate}T</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ background: "#13132a", borderRadius: 12, padding: "16px", border: "1px solid #1e1e3a" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#5060a0", marginBottom: 12 }}>⏰ Bevorstehend</div>
        {upcomingActions.length === 0
          ? <div style={{ color: "#3a3a5a", fontSize: 12 }}>Keine Aktionen geplant</div>
          : upcomingActions.map(a => {
            const daysLeft = Math.ceil((new Date(a.date) - now) / 86400000);
            const urgent = daysLeft <= 2;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a32" }}>
                <span>{ACTION_ICONS[a.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#d0d0f0" }}>{a.note || a.type}</div>
                  <div style={{ fontSize: 10, color: "#606080" }}>{a.contactName} · {a.date}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: urgent ? "#2a1a10" : "#1a1a35", color: urgent ? "#f7a84f" : "#6070a0" }}>
                  {daysLeft === 0 ? "Heute" : daysLeft === 1 ? "Morgen" : `${daysLeft}T`}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ContactModal({ selected, tasks, actions, detailTab, setDetailTab, newTaskText, setNewTaskText, newAction, setNewAction, onClose, onUpdateStage, onUpdateField, onUpdateNote, onAddTask, onToggleTask, onDeleteTask, onAddAction, onToggleAction, onDeleteAction, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const Field = ({ label, field, color, placeholder }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>{label}</div>
      <input key={selected.id + "-" + field} defaultValue={selected[field] || ""} onBlur={e => onUpdateField(field, e.target.value)} placeholder={placeholder || ""}
        style={{ width: "100%", background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: color || "#c0c0e0", padding: "8px 10px", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  const LinkField = ({ label, field, color, placeholder }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input key={selected.id + "-" + field} defaultValue={selected[field] || ""} onBlur={e => onUpdateField(field, e.target.value)} placeholder={placeholder || "https://..."}
          style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: color || "#4f8ef7", padding: "8px 10px", fontSize: 15, outline: "none" }} />
        {selected[field] && (
          <a href={selected[field]} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: "#4f8ef7", background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 7, padding: "8px 12px", textDecoration: "none", display: "flex", alignItems: "center" }}>
            🔗
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
      <div style={{ background: "#0f0f28", borderRadius: 16, border: "1px solid #1e1e3a", width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", animation: "popIn 0.18s ease" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px 11px", borderBottom: "1px solid #1e1e3a", background: "linear-gradient(135deg,#12122c,#15153a)", borderRadius: "16px 16px 0 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{selected.company || selected.name}</div>
              <div style={{ fontSize: 11, color: "#6060a0", marginTop: 1 }}>{selected.name}</div>
              {selected.position && <div style={{ fontSize: 10, color: "#4a5070", marginTop: 1 }}>{selected.position}</div>}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a4a6a", fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
          </div>
          <select value={selected.stage} onChange={e => onUpdateStage(selected, e.target.value)}
            style={{ marginTop: 9, background: "#1a1a35", border: "1px solid #2a2a4a", borderRadius: 7, color: STAGE_COLORS[selected.stage].accent, padding: "6px 10px", fontSize: 13, fontWeight: 700, width: "100%", outline: "none", cursor: "pointer" }}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a32" }}>
            <Field label="Unternehmen *" field="company" />
            <Field label="Name" field="name" />
            <Field label="Position / Jobtitel" field="position" />
            <Field label="Telefon 1" field="phone" />
            <Field label="Telefon 2" field="phone2" />
            <Field label="E-Mail" field="email" />
            <LinkField label="LinkedIn URL" field="linkedin" />
            <LinkField label="Firmen-Website" field="website" placeholder="https://www.firma.de" />
            <div>
              <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>Notiz</div>
              <textarea key={selected.id + "-note"} defaultValue={selected.note || ""} onBlur={e => onUpdateNote(e.target.value)} placeholder="Notiz hinzufügen..." rows={2}
                style={{ width: "100%", background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#c0c0e0", padding: "8px 10px", fontSize: 15, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a32", flexShrink: 0, background: "#0f0f28", position: "sticky", top: 0, zIndex: 1 }}>
            {[["tasks", "✓ Aufgaben"], ["actions", "🔔 Aktionen"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setDetailTab(tab)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${detailTab === tab ? "#4f8ef7" : "transparent"}`, color: detailTab === tab ? "#4f8ef7" : "#4a4a6a", padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: "12px 16px" }}>
            {detailTab === "tasks" ? (
              <>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "9px 10px", background: "#181832", borderRadius: 8, border: "1px solid #22223a" }}>
                    <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task)} style={{ cursor: "pointer", accentColor: "#4ff7a0", width: 18, height: 18, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: task.done ? "#3a3a5a" : "#d0d0f0", textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
                    <button onClick={() => onDeleteTask(task.id)} style={{ background: "none", border: "none", color: "#3a3a5a", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && onAddTask()} placeholder="Neue Aufgabe..."
                    style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e0e0f0", padding: "9px 10px", fontSize: 15, outline: "none" }} />
                  <button onClick={onAddTask} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 7, color: "#4f8ef7", padding: "9px 16px", cursor: "pointer", fontSize: 20, fontWeight: 700 }}>+</button>
                </div>
              </>
            ) : (
              <>
                {actions.map(action => {
                  const isOverdue = !action.done && new Date(action.date) < new Date();
                  return (
                    <div key={action.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "9px 10px", background: isOverdue ? "#180e0e" : "#181832", borderRadius: 9, border: `1px solid ${isOverdue ? "#3a1010" : "#22223a"}` }}>
                      <input type="checkbox" checked={action.done} onChange={() => onToggleAction(action)} style={{ cursor: "pointer", accentColor: "#4ff7a0", marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 14 }}>{ACTION_ICONS[action.type]}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? "#f74f4f" : "#c0c0e0" }}>{action.type}</span>
                          <span style={{ fontSize: 10, color: "#4a4a6a", marginLeft: "auto" }}>{action.date}</span>
                        </div>
                        {action.note && <div style={{ fontSize: 11, color: "#6060a0" }}>{action.note}</div>}
                      </div>
                      <button onClick={() => onDeleteAction(action.id)} style={{ background: "none", border: "none", color: "#3a3a5a", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
                    </div>
                  );
                })}
                <div style={{ background: "#13132e", borderRadius: 9, padding: "12px", border: "1px solid #252545", marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: "#4a4a7a", marginBottom: 8, fontWeight: 700 }}>+ NEUE AKTION</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={newAction.type} onChange={e => setNewAction(p => ({ ...p, type: e.target.value }))}
                      style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e0e0f0", padding: "8px", fontSize: 13, outline: "none" }}>
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_ICONS[t]} {t}</option>)}
                    </select>
                    <input type="date" value={newAction.date} onChange={e => setNewAction(p => ({ ...p, date: e.target.value }))}
                      style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e0e0f0", padding: "8px", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={newAction.note} onChange={e => setNewAction(p => ({ ...p, note: e.target.value }))} onKeyDown={e => e.key === "Enter" && onAddAction()} placeholder="Notiz (optional)..."
                      style={{ flex: 1, background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e0e0f0", padding: "9px 10px", fontSize: 15, outline: "none" }} />
                    <button onClick={onAddAction} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 7, color: "#4f8ef7", padding: "9px 16px", cursor: "pointer", fontSize: 20, fontWeight: 700 }}>+</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delete */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a32", flexShrink: 0 }}>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ width: "100%", background: "none", border: "1px solid #2a1010", borderRadius: 8, color: "#f74f4f", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              🗑 Kontakt löschen
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#9060a0", marginBottom: 10 }}>"{selected.company || selected.name}" wirklich löschen?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, background: "none", border: "1px solid #252545", borderRadius: 8, color: "#6060a0", padding: "10px", cursor: "pointer", fontSize: 13 }}>Abbrechen</button>
                <button onClick={onDelete} style={{ flex: 1, background: "linear-gradient(135deg,#c0302a,#8a1a1a)", border: "none", borderRadius: 8, color: "#fff", padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Ja, löschen</button>
              </div>
            </div>
          )}
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
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);
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
    } catch (e) {
      setError("Verbindungsfehler: " + e.message);
    } finally {
      setLoading(false);
    }
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
    if (!newContact.company.trim() && !newContact.name.trim()) return;
    const res = await db.addContact(newContact);
    setContacts(prev => [...prev, res[0]]);
    setNewContact(EMPTY_CONTACT);
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

  const handleUpdateField = (field, value) => withSave(async () => {
    await db.updateContact(selected.id, { [field]: value });
    setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, [field]: value } : c));
    setSelected(prev => ({ ...prev, [field]: value }));
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #1e1e3a", borderTop: "3px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#4a4a6a", fontSize: 13 }}>Verbindung zu Supabase...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 20 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: "#f74f4f", fontSize: 13, textAlign: "center" }}>{error}</div>
      <button onClick={loadAll} style={{ background: "#1e3a5f", border: "1px solid #4f8ef7", borderRadius: 8, color: "#4f8ef7", padding: "10px 24px", cursor: "pointer", fontSize: 14 }}>Erneut versuchen</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#e8e8f0", fontFamily: "'Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, select, textarea, button { font-family: inherit; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "11px 14px", background: "#0d0d1a", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#b44ff7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>C</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Mein CRM</div>
            <div style={{ fontSize: 9, color: "#4a4a6a" }}>{contacts.length} Kontakte{saving ? " · Speichert..." : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "#13132a", borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {[["kanban", "🗂"], ["stats", "📊"]].map(([p, icon]) => (
            <button key={p} onClick={() => setPage(p)} style={{ position: "relative", background: page === p ? "linear-gradient(135deg,#4f8ef7,#3a6fd8)" : "none", border: "none", borderRadius: 6, color: "#fff", padding: "5px 11px", fontSize: 15, cursor: "pointer" }}>
              {icon}
              {p === "stats" && overdueCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, background: "#f74f4f", borderRadius: 10, fontSize: 8, fontWeight: 900, color: "#fff", padding: "1px 3px" }}>{overdueCount}</span>}
            </button>
          ))}
        </div>
<div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-end", alignItems: "center", overflow: "hidden" }}>
        {page === "kanban" && window.innerWidth >= 480 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Suchen..."
              style={{ background: "#16162e", border: "1px solid #2a2a4a", borderRadius: 7, color: "#e8e8f0", padding: "6px 10px", fontSize: 13, outline: "none", flex: 1, maxWidth: 160, minWidth: 80 }} />
          )}
<button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#4f8ef7,#3a6fd8)", border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginRight: 4 }}>+ Neu</button>
</div>
      </div>

      {/* Pages */}
      {page === "stats" ? (
        <StatsPage contacts={contacts} allTasks={allTasks} allActions={allActions} />
      ) : (
        <div style={{ display: "flex", gap: 10, padding: "12px 10px 0", overflowX: "auto", flex: 1, WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}>
          {STAGES.map(stage => {
            const col = STAGE_COLORS[stage];
            const cards = byStage(stage);
            const isOver = dragOver === stage;
            return (
              <div key={stage}
                onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, stage)}
minWidth: window.innerWidth < 768 ? "calc(88vw)" : 220, width: window.innerWidth < 768 ? "calc(88vw)" : 220,
                <div style={{ padding: "11px 12px 8px", borderBottom: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: col.accent }}>{stage}</span>
                  <span style={{ background: col.badge, color: col.accent, borderRadius: 20, fontSize: 9, fontWeight: 700, padding: "2px 7px" }}>{cards.length}</span>
                </div>
                <div style={{ overflowY: "auto", padding: "7px 7px 0", flex: 1, display: "flex", flexDirection: "column", gap: 7, WebkitOverflowScrolling: "touch" }}>
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
                        style={{ background: "#181830", borderRadius: 9, border: "1px solid #22223a", padding: "10px 11px", cursor: "pointer", opacity: dragging?.id === contact.id ? 0.4 : 1, WebkitUserSelect: "none", userSelect: "none" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#f0f0ff", marginBottom: 2 }}>{contact.company || contact.name}</div>
                        <div style={{ fontSize: 11, color: "#606080", marginBottom: contact.position ? 2 : 6 }}>{contact.name}</div>
                        {contact.position && <div style={{ fontSize: 10, color: "#4a5070", marginBottom: 6 }}>{contact.position}</div>}
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {cTasks.length > 0 && <span style={{ fontSize: 9, background: "#1e1e3a", color: "#6070a0", borderRadius: 5, padding: "2px 6px" }}>✓ {cTasks.filter(t => t.done).length}/{cTasks.length}</span>}
                          {pendActs > 0 && <span style={{ fontSize: 9, background: overActs ? "#2a1010" : "#1a2035", color: overActs ? "#f74f4f" : "#4f8ef7", borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{overActs ? `⚠️ ${overActs}` : `🔔 ${pendActs}`}</span>}
                          {contact.linkedin && <span style={{ fontSize: 9, background: "#1a2535", color: "#4f8ef7", borderRadius: 5, padding: "2px 6px" }}>🔗</span>}
                          {contact.website && <span style={{ fontSize: 9, background: "#1a3525", color: "#4ff7a0", borderRadius: 5, padding: "2px 6px" }}>🌐</span>}
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <div style={{ textAlign: "center", color: "#252540", fontSize: 11, padding: "20px 0" }}>Hierher ziehen</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Modal — mittig */}
      {selected && (
        <ContactModal
          selected={selected} tasks={tasks} actions={actions}
          detailTab={detailTab} setDetailTab={setDetailTab}
          newTaskText={newTaskText} setNewTaskText={setNewTaskText}
          newAction={newAction} setNewAction={setNewAction}
          onClose={() => setSelected(null)}
          onUpdateStage={handleUpdateContactStage}
          onUpdateField={handleUpdateField}
          onUpdateNote={handleUpdateNote}
          onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask}
          onAddAction={handleAddAction} onToggleAction={handleToggleAction} onDeleteAction={handleDeleteAction}
          onDelete={handleDeleteContact}
        />
      )}

      {/* Add Contact Modal — mittig */}
      {showAdd && (
        <div onClick={e => e.target === e.currentTarget && setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
          <div style={{ background: "#12122c", borderRadius: 16, padding: "22px 18px 18px", width: "100%", maxWidth: 380, border: "1px solid #252545", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, color: "#fff" }}>Neuer Kontakt</div>
            {[
              ["company",  "Unternehmen *"],
              ["name",     "Name"],
              ["position", "Position / Jobtitel"],
              ["phone",    "Telefon 1"],
              ["phone2",   "Telefon 2"],
              ["email",    "E-Mail"],
              ["linkedin", "LinkedIn URL"],
              ["website",  "Firmen-Website"],
            ].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>{label}</div>
                <input value={newContact[field]} onChange={e => setNewContact(prev => ({ ...prev, [field]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleAddContact()}
                  style={{ width: "100%", background: "#181835", border: "1px solid #252545", borderRadius: 8, color: "#e0e0f0", padding: "9px 11px", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#5060a0", marginBottom: 3 }}>Phase</div>
              <select value={newContact.stage} onChange={e => setNewContact(prev => ({ ...prev, stage: e.target.value }))}
                style={{ width: "100%", background: "#181835", border: "1px solid #252545", borderRadius: 8, color: "#e0e0f0", padding: "9px 11px", fontSize: 15, outline: "none" }}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddContact} style={{ flex: 1, background: "linear-gradient(135deg,#4f8ef7,#3a6fd8)", border: "none", borderRadius: 9, color: "#fff", padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Hinzufügen</button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "none", border: "1px solid #252545", borderRadius: 9, color: "#6060a0", padding: "11px", fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
