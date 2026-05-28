import { useState, useEffect, useCallback } from "react";

// ─── Design tokens ──────────────────────────────────────────────
const COLORS = {
  bg:       "#F8F9FC",
  surface:  "#FFFFFF",
  card:     "#FFFFFF",
  border:   "#E5E7EB",
  accent:   "#EF4444",
  accentDim:"#B91C1C",
  gold:     "#F59E0B",
  green:    "#10B981",
  red:      "#EF4444",
  orange:   "#F97316",
  text:     "#111827",
  muted:    "#6B7280",
  subtle:   "#9CA3AF",
}
const STATUS_CONFIG = {
  waiting:     { color: COLORS.gold,   bg: "#2A1F00", label: "Waiting"     },
  in_progress: { color: COLORS.accent, bg: "#0D1B35", label: "In Progress" },
  completed:   { color: COLORS.green,  bg: "#062017", label: "Completed"   },
  cancelled:   { color: COLORS.red,    bg: "#200A0A", label: "Cancelled"   },
};

// ─── Real API ────────────────────────────────────────────────────
const BASE_URL = "http://localhost:5000";

// Token helpers
const Auth = {
  getToken:    ()  => sessionStorage.getItem("qio_token"),
  setToken:    (t) => sessionStorage.setItem("qio_token", t),
  removeToken: ()  => sessionStorage.removeItem("qio_token"),
  getUser:     ()  => { try { return JSON.parse(sessionStorage.getItem("qio_user")); } catch { return null; } },
  setUser:     (u) => sessionStorage.setItem("qio_user", JSON.stringify(u)),
  removeUser:  ()  => sessionStorage.removeItem("qio_user"),
  isLoggedIn:  ()  => !!sessionStorage.getItem("qio_token"),
};

async function apiFetch(method, path, body) {
  const token = Auth.getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json.data !== undefined ? json.data : json;
}

async function loginRequest(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json?.error || "Login failed");
  return json;
}


const api = {
  // GET /api/operator/queue/1
  getQueue: async () => {
    const data = await apiFetch("GET", "/api/operator/queue/1");
    return { queue: data.queue, tickets: data.tickets };
  },

  // POST /api/operator/queue/1/call-next
  callNext: async () => {
    try {
      const data = await apiFetch("POST", "/api/operator/queue/1/call-next");
      return { success: true, data: data.data || data };
    } catch (e) {
      return { error: e.message };
    }
  },

  // POST /api/operator/queue/1/pause
  pauseQueue: async () => {
    try { await apiFetch("POST", "/api/operator/queue/1/pause"); return { success: true }; }
    catch (e) { return { error: e.message }; }
  },

  // POST /api/operator/queue/1/resume
  resumeQueue: async () => {
    try { await apiFetch("POST", "/api/operator/queue/1/resume"); return { success: true }; }
    catch (e) { return { error: e.message }; }
  },

  // POST /api/operator/ticket/:id/end-service
  endService: async (id) => {
    try { await apiFetch("POST", `/api/operator/ticket/${id}/end-service`); return { success: true }; }
    catch (e) { return { error: e.message }; }
  },

  // POST /api/operator/queue/1/walk-in  (for walk-in modal)
  bookTicket: async ({ name, phone, service_id, queue_id }) => {
    try {
      const data = await apiFetch("POST", "/api/operator/queue/1/walk-in", {
        name, phone, service_id: parseInt(service_id), queue_id: parseInt(queue_id),
      });
      return { success: true, ticket_number: data.ticket_number, ticket_id: data.ticket_id };
    } catch (e) {
      return { error: e.message };
    }
  },

  // GET /api/customers/track/:id
  trackTicket: async (id) => {
    try {
      const data = await apiFetch("GET", `/api/customers/track/${id}`);
      return data;
    } catch (e) {
      return { error: e.message };
    }
  },

  // DELETE /api/customers/cancel/:id
  cancelTicket: async (id) => {
    try { await apiFetch("DELETE", `/api/customers/cancel/${id}`); return { success: true }; }
    catch (e) { return { error: e.message }; }
  },

  // GET /api/services
  getServices: async () => {
    try {
      const data = await apiFetch("GET", "/api/services");
      return Array.isArray(data) ? data : [];
    } catch {
      // fallback if /api/services doesn't exist yet
      return [
        { id: 1, name: "General Inquiry",     estimated_time: 5  },
        { id: 2, name: "Account Services",    estimated_time: 10 },
        { id: 3, name: "Technical Support",   estimated_time: 15 },
        { id: 4, name: "Document Processing", estimated_time: 8  },
      ];
    }
  },

  // GET all tickets for admin history
  getHistory: async () => {
    try {
      const data = await apiFetch("GET", "/api/operator/queue/1");
      return (data.tickets || []);
    } catch { return []; }
  },
};

// ─── Shared components ───────────────────────────────────────────
function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: COLORS.muted, bg: "#1A2236", label: status };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      textTransform: "uppercase",
    }}>{cfg.label}</span>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 8, fontWeight: 600,
    fontSize: small ? 12 : 14, transition: "all 0.15s",
    padding: small ? "6px 14px" : "10px 20px",
    opacity: disabled ? 0.45 : 1,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
  const variants = {
    primary: { background: COLORS.accent,  color: "#fff" },
    danger:  { background: COLORS.red,     color: "#fff" },
    ghost:   { background: "transparent",  color: COLORS.subtle, border: `1px solid ${COLORS.border}` },
    success: { background: COLORS.green,   color: "#fff" },
    warning: { background: COLORS.gold,    color: "#000" },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 12,
      border: `1px solid ${COLORS.border}`, padding: "20px 24px",
      ...style,
    }}>{children}</div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: COLORS.subtle, marginBottom: 6, fontWeight: 500 }}>{label}</label>}
      <input {...props} style={{
        width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14,
        outline: "none", boxSizing: "border-box", ...props.style,
      }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: COLORS.subtle, marginBottom: 6, fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{
        width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14,
        outline: "none", boxSizing: "border-box",
      }}>{children}</select>
    </div>
  );
}

function StatCard({ label, value, color = COLORS.accent, icon }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`,
      padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success: COLORS.green, error: COLORS.red, info: COLORS.accent };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: COLORS.card, border: `1px solid ${colors[type]}66`,
      borderLeft: `3px solid ${colors[type]}`,
      borderRadius: 10, padding: "14px 20px", maxWidth: 340,
      boxShadow: `0 8px 30px #00000066`,
      animation: "slideIn 0.2s ease",
    }}>
      <div style={{ color: COLORS.text, fontSize: 14 }}>{msg}</div>
    </div>
  );
}

// ─── OPERATOR DASHBOARD ──────────────────────────────────────────
function OperatorDashboard() {
  const [queue,        setQueue]        = useState(null);
  const [tickets,      setTickets]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const load = useCallback(async () => {
    try {
      const data = await api.getQueue();
      setQueue(data.queue);
      setTickets(data.tickets || []);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Auto-refresh every 5s
  useEffect(() => {
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const callNext = async () => {
    setActing(true);
    const res = await api.callNext();
    if (res.error) showToast(res.error, "error");
    else showToast(`Now serving Ticket #${res.data?.ticket_number}`, "success");
    await load();
    setActing(false);
  };

  const endService = async (id) => {
    const res = await api.endService(id);
    if (res.error) showToast(res.error, "error");
    else showToast("Service completed", "success");
    await load();
  };

  const toggleQueue = async () => {
    if (queue?.status === "active") await api.pauseQueue();
    else await api.resumeQueue();
    await load();
    showToast(queue?.status === "active" ? "Queue paused" : "Queue resumed");
  };

  const waiting       = tickets.filter(t => t.status === "waiting").length;
  const serving       = tickets.filter(t => t.status === "in_progress").length;
  const done          = tickets.filter(t => t.status === "completed").length;
  const displayed     = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);
  const currentTicket = tickets.find(t => t.status === "in_progress");

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: COLORS.muted }}>
      Loading queue…
    </div>
  );

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Waiting"      value={waiting} color={COLORS.gold}   icon="⏳" />
        <StatCard label="In Service"   value={serving} color={COLORS.accent} icon="🎯" />
        <StatCard label="Completed"    value={done}    color={COLORS.green}  icon="✅" />
        <StatCard label="Queue Status"
          value={queue?.status === "active" ? "Active" : "Paused"}
          color={queue?.status === "active" ? COLORS.green : COLORS.orange} icon="📡" />
      </div>

      {/* Current ticket */}
      {currentTicket && (
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.accentDim}22, ${COLORS.accent}11)`,
          border: `1px solid ${COLORS.accent}44`, borderRadius: 12,
          padding: "16px 24px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>NOW SERVING</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text }}>
              Ticket #{currentTicket.ticket_number} — {currentTicket.customer_name}
            </div>
            <div style={{ fontSize: 13, color: COLORS.subtle, marginTop: 2 }}>{currentTicket.service_name}</div>
          </div>
          <Btn variant="success" onClick={() => endService(currentTicket.id)}>Mark Complete</Btn>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn onClick={callNext} disabled={acting || queue?.status === "paused"}>
          {acting ? "Calling…" : "⏩ Call Next"}
        </Btn>
        <Btn variant={queue?.status === "active" ? "warning" : "success"} onClick={toggleQueue}>
          {queue?.status === "active" ? "⏸ Pause Queue" : "▶ Resume Queue"}
        </Btn>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "waiting", "in_progress", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            background: filterStatus === s ? COLORS.accent : "transparent",
            color: filterStatus === s ? "#fff" : COLORS.muted,
            border: `1px solid ${filterStatus === s ? COLORS.accent : COLORS.border}`,
            borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
            fontWeight: 500, textTransform: "capitalize",
          }}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {displayed.length === 0 && (
          <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>No tickets found</div>
        )}
        {displayed.map(t => (
          <div key={t.id} style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 16,
            borderLeft: t.status === "in_progress" ? `3px solid ${COLORS.accent}` :
                        t.status === "waiting"      ? `3px solid ${COLORS.gold}`   : `3px solid transparent`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: COLORS.surface, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, color: COLORS.accent, fontSize: 15, flexShrink: 0,
            }}>#{t.ticket_number}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: COLORS.text, fontSize: 14 }}>{t.customer_name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{t.service_name}</div>
            </div>
            <Badge status={t.status} />
            {t.status === "in_progress" && (
              <Btn small variant="success" onClick={() => endService(t.id)}>✓ Done</Btn>
            )}
          </div>
        ))}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── CUSTOMER BOOKING ────────────────────────────────────────────
function CustomerBooking() {
  const [step,        setStep]        = useState("form");
  const [form,        setForm]        = useState({ name: "", phone: "", service_id: "1", queue_id: "1" });
  const [booking,     setBooking]     = useState(null);
  const [trackId,     setTrackId]     = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState(null);
  const [cancelling,  setCancelling]  = useState(false);
  const [services,    setServices]    = useState([]);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => { api.getServices().then(setServices); }, []);

  const book = async () => {
    if (!form.name || !form.phone) return showToast("Name and phone are required", "error");
    setLoading(true);
    try {
      // First create customer, then book ticket
      const custRes = await apiFetch("POST", "/api/customers", { name: form.name, phone: form.phone });
      const customer = custRes.data || custRes;
      const res = await apiFetch("POST", "/api/customers/book", {
        customer_id: customer.id,
        service_id:  parseInt(form.service_id),
        queue_id:    parseInt(form.queue_id),
      });
      setBooking(res.data || res);
      setStep("confirm");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const track = async () => {
    if (!trackId) return;
    setLoading(true);
    const res = await api.trackTicket(trackId);
    if (res.error) showToast(res.error, "error");
    else setTrackResult(res);
    setLoading(false);
  };

  const cancel = async () => {
    if (!trackResult) return;
    setCancelling(true);
    const res = await api.cancelTicket(trackResult.id || trackId);
    if (res.error) showToast(res.error, "error");
    else { showToast("Ticket cancelled", "success"); setTrackResult(null); setTrackId(""); }
    setCancelling(false);
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, background: COLORS.surface, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[["book", "📋 Book a Ticket"], ["track", "🔍 Track My Ticket"]].map(([key, label]) => (
          <button key={key} onClick={() => { setStep(key); setTrackResult(null); }} style={{
            background: step === key || (step === "confirm" && key === "book") ? COLORS.accent : "transparent",
            color: step === key || (step === "confirm" && key === "book") ? "#fff" : COLORS.muted,
            border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {/* Booking form */}
      {(step === "form" || step === "book") && (
        <Card>
          <h3 style={{ color: COLORS.text, margin: "0 0 20px" }}>Book Your Spot</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Input label="Full Name" placeholder="Your name"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Phone" placeholder="+213…"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Select label="Select Service" value={form.service_id}
            onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} — ~{s.estimated_time} min</option>
            ))}
          </Select>
          <div style={{ marginTop: 4 }}>
            <Btn onClick={book} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Booking…" : "Confirm Booking"}
            </Btn>
          </div>
        </Card>
      )}

      {/* Booking confirmation */}
      {step === "confirm" && booking && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            textAlign: "center", padding: "32px 24px",
            background: `${COLORS.green}11`, border: `1px solid ${COLORS.green}33`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: COLORS.accent, marginBottom: 4 }}>
              #{booking.ticket_number}
            </div>
            <div style={{ color: COLORS.green, fontWeight: 600, marginBottom: 16 }}>Ticket Booked Successfully!</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 320, margin: "0 auto" }}>
              <div style={{ background: COLORS.card, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>QUEUE POSITION</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>#{booking.queue_position}</div>
              </div>
              <div style={{ background: COLORS.card, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>EST. WAIT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.gold }}>{booking.estimated_wait}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: COLORS.muted }}>
              Service: <span style={{ color: COLORS.subtle }}>{booking.service}</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>
              Save your ticket ID: <code style={{ color: COLORS.accent }}>#{booking.ticket_id}</code>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => { setStep("book"); setBooking(null); }} style={{ flex: 1, justifyContent: "center" }}>
              Book Another
            </Btn>
            <Btn onClick={() => { setTrackId(String(booking.ticket_id)); setStep("track"); }}
              style={{ flex: 1, justifyContent: "center" }}>
              Track This Ticket
            </Btn>
          </div>
        </div>
      )}

      {/* Tracking */}
      {step === "track" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ color: COLORS.text, margin: "0 0 16px" }}>Track Your Ticket</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <input placeholder="Enter ticket ID…" value={trackId}
                onChange={e => setTrackId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && track()}
                style={{
                  flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14, outline: "none",
                }} />
              <Btn onClick={track} disabled={loading}>{loading ? "…" : "Track"}</Btn>
            </div>
          </Card>

          {trackResult && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.accent }}>#{trackResult.ticket_number}</div>
                  <div style={{ color: COLORS.subtle, fontSize: 13, marginTop: 2 }}>{trackResult.customer_name}</div>
                </div>
                <Badge status={trackResult.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: COLORS.surface, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>SERVICE</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{trackResult.service_name}</div>
                </div>
                {trackResult.status === "waiting" && (
                  <>
                    <div style={{ background: COLORS.surface, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>POSITION</div>
                      <div style={{ fontSize: 18, color: COLORS.gold, fontWeight: 700 }}>#{trackResult.queue_position}</div>
                    </div>
                    <div style={{ background: COLORS.surface, borderRadius: 8, padding: "12px 14px", gridColumn: "1/-1" }}>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>ESTIMATED WAIT</div>
                      <div style={{ fontSize: 18, color: COLORS.accent, fontWeight: 700 }}>{trackResult.estimated_wait}</div>
                    </div>
                  </>
                )}
              </div>
              {trackResult.status === "waiting" && (
                <Btn variant="danger" onClick={cancel} disabled={cancelling} style={{ width: "100%", justifyContent: "center" }}>
                  {cancelling ? "Cancelling…" : "Cancel Booking"}
                </Btn>
              )}
            </Card>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── LIVE DISPLAY (TV mode) ──────────────────────────────────────
function LiveDisplay() {
  const [tickets, setTickets] = useState([]);
  const [queue,   setQueue]   = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getQueue();
      setQueue(data.queue);
      setTickets(data.tickets || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const current = tickets.find(t => t.status === "in_progress");
  const waiting = tickets.filter(t => t.status === "waiting");

  return (
    <div style={{
      background: "#f8dddd", minHeight: 420, borderRadius: 12,
      border: `1px solid ${COLORS.border}`, overflow: "hidden",
    }}>
      <div style={{
        background: COLORS.accentDim, padding: "14px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "0.1em" }}>
          🏢 QUEUE MANAGEMENT SYSTEM
        </div>
        <div style={{ color: "#ffffffcc", fontSize: 12 }}>
          {queue?.status === "active" ? "🟢 ACTIVE" : "🟠 PAUSED"} · Auto-refresh every 4s
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, minHeight: 360 }}>
        <div style={{
          padding: 32, borderRight: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#feecec",
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: COLORS.muted, marginBottom: 16, fontWeight: 600 }}>
            NOW SERVING
          </div>
          {current ? (
            <>
              <div style={{ fontSize: 72, fontWeight: 900, color: COLORS.accent, lineHeight: 1 }}>
                {current.ticket_number.toString().padStart(3, "0")}
              </div>
              <div style={{ color: COLORS.text, fontWeight: 600, marginTop: 12, fontSize: 18 }}>
                {current.customer_name}
              </div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{current.service_name}</div>
            </>
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 16 }}>No active ticket</div>
          )}
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: COLORS.muted, marginBottom: 16, fontWeight: 600 }}>
            WAITING — {waiting.length} in queue
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {waiting.slice(0, 6).map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8,
                background: i === 0 ? `${COLORS.gold}18` : COLORS.card,
                border: `1px solid ${i === 0 ? COLORS.gold + "44" : COLORS.border}`,
              }}>
                <div style={{ fontWeight: 800, color: i === 0 ? COLORS.gold : COLORS.accent, fontSize: 16, minWidth: 38 }}>
                  #{t.ticket_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>{t.customer_name}</div>
                  <div style={{ color: COLORS.muted, fontSize: 11 }}>{t.service_name}</div>
                </div>
                {i === 0 && <span style={{ fontSize: 11, color: COLORS.gold, fontWeight: 600 }}>NEXT</span>}
              </div>
            ))}
            {waiting.length === 0 && (
              <div style={{ color: COLORS.muted, textAlign: "center", padding: 20 }}>Queue is empty</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────
function AdminDashboard() {
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = useState("all");   // today | week | all
  const [search,    setSearch]    = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir,   setSortDir]   = useState("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getHistory();
    setTickets(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  // ── filter by time range ─────────────────────────────────────
  const now = new Date();
  const filtered = tickets.filter(t => {
    const created = new Date(t.created_at);
    if (range === "today") {
      return created.toDateString() === now.toDateString();
    }
    if (range === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return created >= weekAgo;
    }
    return true; // all
  }).filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.customer_name?.toLowerCase().includes(q) ||
      t.service_name?.toLowerCase().includes(q) ||
      String(t.ticket_number).includes(q)
    );
  });

  // ── sort ──────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? "";
    let vb = b[sortField] ?? "";
    if (sortField === "created_at") { va = new Date(va); vb = new Date(vb); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── stats ─────────────────────────────────────────────────────
  const total     = filtered.length;
  const completed = filtered.filter(t => t.status === "completed").length;
  const cancelled = filtered.filter(t => t.status === "cancelled").length;
  const waiting   = filtered.filter(t => t.status === "waiting").length;
  const inProg    = filtered.filter(t => t.status === "in_progress").length;

  // busiest service
  const svcCount = {};
  filtered.forEach(t => { if (t.service_name) svcCount[t.service_name] = (svcCount[t.service_name] || 0) + 1; });
  const busiest  = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ color: COLORS.muted, marginLeft: 4 }}>↕</span>;
    return <span style={{ color: COLORS.accent, marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString([], {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total",       value: total,     color: COLORS.subtle },
          { label: "Completed",   value: completed, color: COLORS.green  },
          { label: "Cancelled",   value: cancelled, color: COLORS.red    },
          { label: "Waiting",     value: waiting,   color: COLORS.gold   },
          { label: "In Progress", value: inProg,    color: COLORS.accent },
        ].map(s => (
          <div key={s.label} style={{
            background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Busiest service */}
      {busiest && (
        <div style={{
          background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}33`,
          borderRadius: 10, padding: "12px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <div>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>Most requested service: </span>
            <span style={{ color: COLORS.accent, fontWeight: 700 }}>{busiest[0]}</span>
            <span style={{ color: COLORS.muted, fontSize: 12 }}> — {busiest[1]} ticket{busiest[1] !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Time range tabs */}
        <div style={{ display: "flex", background: COLORS.surface, borderRadius: 8, padding: 3, gap: 2 }}>
          {[["today", "Today"], ["week", "Last 7 Days"], ["all", "All Time"]].map(([val, label]) => (
            <button key={val} onClick={() => setRange(val)} style={{
              background: range === val ? COLORS.accent : "transparent",
              color:      range === val ? "#fff" : COLORS.muted,
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontSize: 12, cursor: "pointer", fontWeight: 500,
            }}>{label}</button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search by customer, service, ticket…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: "7px 12px", color: COLORS.text,
            fontSize: 13, outline: "none",
          }}
        />

      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", color: COLORS.muted, padding: 60 }}>Loading history…</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.muted, padding: 60 }}>No tickets found for this period.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                {[
                  ["ticket_number", "#"],
                  ["customer_name", "Customer"],
                  ["service_name",  "Service"],
                  ["status",        "Status"],
                  ["created_at",    "Joined At"],
                ].map(([field, label]) => (
                  <th key={field}
                    onClick={() => toggleSort(field)}
                    style={{
                      textAlign: "left", padding: "10px 14px",
                      color: COLORS.subtle, fontWeight: 600,
                      fontSize: 11, letterSpacing: "0.06em",
                      textTransform: "uppercase", cursor: "pointer",
                      userSelect: "none",
                      background: COLORS.surface,
                    }}>
                    {label}<SortIcon field={field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.id} style={{
                  borderBottom: `1px solid ${COLORS.border}`,
                  background: i % 2 === 0 ? COLORS.card : COLORS.surface,
                }}>
                  <td style={{ padding: "11px 14px", color: COLORS.accent, fontWeight: 700 }}>
                    #{t.ticket_number}
                  </td>
                  <td style={{ padding: "11px 14px", color: COLORS.text, fontWeight: 500 }}>
                    {t.customer_name || "—"}
                  </td>
                  <td style={{ padding: "11px 14px", color: COLORS.subtle }}>
                    {t.service_name || "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <Badge status={t.status} />
                  </td>
                  <td style={{ padding: "11px 14px", color: COLORS.muted, fontSize: 12 }}>
                    {formatDate(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row count */}
      {!loading && (
        <div style={{ marginTop: 12, color: COLORS.muted, fontSize: 12, textAlign: "right" }}>
          Showing {sorted.length} of {tickets.length} tickets
        </div>
      )}
    </div>
  );
}


// ─── LOGIN SCREEN ────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await loginRequest(username.trim(), password.trim());
      Auth.setToken(res.token);
      Auth.setUser(res.user);
      onLogin(res.user);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #475569; }
      `}</style>

      <div style={{ width: 360, padding: "0 16px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${COLORS.accent}22`, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 14px",
          }}>🎛️</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: COLORS.text, letterSpacing: "-0.02em" }}>
            <span style={{ color: COLORS.accent }}>Q</span>ueue<span style={{ color: COLORS.accent }}>.</span>io
          </div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>
            Operator Portal — Sign in to continue
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: COLORS.card, borderRadius: 14,
          border: `1px solid ${COLORS.border}`, padding: "28px 24px",
        }}>
          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: COLORS.subtle, marginBottom: 6, fontWeight: 600 }}>
              Username
            </label>
            <input
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              autoComplete="username"
              style={{
                width: "100%", background: COLORS.surface,
                border: `1px solid ${error ? COLORS.red : COLORS.border}`,
                borderRadius: 8, padding: "11px 14px",
                color: COLORS.text, fontSize: 14, outline: "none",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: COLORS.subtle, marginBottom: 6, fontWeight: 600 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                placeholder="Enter password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                autoComplete="current-password"
                style={{
                  width: "100%", background: COLORS.surface,
                  border: `1px solid ${error ? COLORS.red : COLORS.border}`,
                  borderRadius: 8, padding: "11px 40px 11px 14px",
                  color: COLORS.text, fontSize: 14, outline: "none",
                }}
              />
              <button onClick={() => setShowPass(s => !s)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14,
              }}>{showPass ? "🙈" : "👁"}</button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: `${COLORS.red}18`, border: `1px solid ${COLORS.red}44`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 16,
              color: COLORS.red, fontSize: 13,
            }}>⚠ {error}</div>
          )}

          {/* Submit */}
          <button onClick={submit} disabled={loading} style={{
            width: "100%", background: COLORS.accent, color: "#fff",
            border: "none", borderRadius: 10, padding: "13px",
            fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: COLORS.muted, fontSize: 12 }}>
          Queue Management System — Operator Access Only
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────

// ─── ADMIN PORTAL ────────────────────────────────────────────────
function AdminPortal({ user, onLogout }) {
  const [view, setView] = useState("history");

  const navItems = [
    { id: "history",   label: "Ticket History",    icon: "📋" },
    { id: "customers", label: "Manage Customers",  icon: "👥" },
    { id: "services",  label: "Manage Services",   icon: "🛠" },
    { id: "monitor",   label: "Monitor Queue",     icon: "📡" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:#475569; }
        select option { background:#131929; }
        @keyframes slideIn { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0B0F1A}
        ::-webkit-scrollbar-thumb{background:#1E2D45;border-radius:3px}
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* Topbar */}
      <div style={{ background: COLORS.surface, borderBottom:`1px solid ${COLORS.border}`,
        padding:"0 32px", display:"flex", alignItems:"center", height:56, gap:32,
        position:"sticky", top:0, zIndex:50 }}>
        <div style={{ fontWeight:800, fontSize:15, color:COLORS.text, letterSpacing:"-0.02em" }}>
          <span style={{ color:COLORS.accent }}>Q</span>ueue<span style={{ color:COLORS.accent }}>.</span>io
        </div>
        <nav style={{ display:"flex", gap:4 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              background: view===n.id ? `${COLORS.accent}22` : "transparent",
              color: view===n.id ? COLORS.accent : COLORS.muted,
              border:"none", borderRadius:8, padding:"6px 16px",
              fontSize:13, cursor:"pointer", fontWeight:500,
              display:"flex", alignItems:"center", gap:6,
            }}>{n.icon} {n.label}</button>
          ))}
        </nav>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:12, color:COLORS.muted }}>
            👤 <span style={{ color:COLORS.subtle, fontWeight:600 }}>{user?.username}</span>
            <span style={{ marginLeft:6, background:`${COLORS.gold}22`, color:COLORS.gold,
              fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20 }}>ADMIN</span>
          </div>
          <button onClick={onLogout} style={{
            background:"transparent", border:`1px solid ${COLORS.border}`,
            borderRadius:7, padding:"5px 12px", color:COLORS.muted,
            fontSize:12, cursor:"pointer", fontWeight:500,
          }}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 24px" }}>
        {view === "history"   && <AdminTicketHistory />}
        {view === "customers" && <AdminCustomers />}
        {view === "services"  && <AdminServices />}
        {view === "monitor"   && <AdminMonitor />}
      </div>
    </div>
  );
}

// ── AdminTicketHistory ───────────────────────────────────────────
function AdminTicketHistory() {
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = useState("all");
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir,   setSortDir]   = useState("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getHistory();
    setTickets(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const now = new Date();
  const filtered = tickets.filter(t => {
    const d = new Date(t.created_at);
    if (range === "today") return d.toDateString() === now.toDateString();
    if (range === "week")  { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    return true;
  }).filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.customer_name?.toLowerCase().includes(q) ||
           t.service_name?.toLowerCase().includes(q) ||
           String(t.ticket_number).includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? "", vb = b[sortField] ?? "";
    if (sortField === "created_at") { va = new Date(va); vb = new Date(vb); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (f) => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  };

  const total     = filtered.length;
  const completed = filtered.filter(t => t.status === "completed").length;
  const cancelled = filtered.filter(t => t.status === "cancelled").length;

  const svcCount = {};
  filtered.forEach(t => { if (t.service_name) svcCount[t.service_name] = (svcCount[t.service_name]||0)+1; });
  const busiest = Object.entries(svcCount).sort((a,b)=>b[1]-a[1])[0];

  const fmt = (d) => d ? new Date(d).toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
  const duration = (t) => {
    if (!t.updated_at || !t.created_at) return "—";
    const diff = Math.floor((new Date(t.updated_at)-new Date(t.created_at))/1000);
    if (diff < 0) return "—";
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff/60)}m ${diff%60}s`;
  };

  const SortIcon = ({f}) => sortField!==f
    ? <span style={{color:COLORS.muted,marginLeft:4}}>↕</span>
    : <span style={{color:COLORS.accent,marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:COLORS.text}}>Ticket History</h1>
        <p style={{color:COLORS.muted,fontSize:13,marginTop:4}}>Full log of all queue tickets with customer and service details.</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {[
          {label:"Total",     value:total,     color:COLORS.subtle},
          {label:"Completed", value:completed, color:COLORS.green },
          {label:"Cancelled", value:cancelled, color:COLORS.red   },
          {label:"Top Service",value:busiest?`${busiest[0]} (${busiest[1]})`:"—",color:COLORS.accent,small:true},
        ].map(s=>(
          <div key={s.label} style={{background:COLORS.card,borderRadius:10,border:`1px solid ${COLORS.border}`,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:COLORS.muted,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:s.small?14:22,fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",background:COLORS.surface,borderRadius:8,padding:3,gap:2}}>
          {[["today","Today"],["week","7 Days"],["all","All Time"]].map(([v,l])=>(
            <button key={v} onClick={()=>setRange(v)} style={{
              background:range===v?COLORS.accent:"transparent", color:range===v?"#fff":COLORS.muted,
              border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:500,
            }}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",background:COLORS.surface,borderRadius:8,padding:3,gap:2}}>
          {[["all","All"],["waiting","Waiting"],["in_progress","In Progress"],["completed","Completed"],["cancelled","Cancelled"]].map(([v,l])=>(
            <button key={v} onClick={()=>setStatusFilter(v)} style={{
              background:statusFilter===v?COLORS.accent:"transparent", color:statusFilter===v?"#fff":COLORS.muted,
              border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:500,
            }}>{l}</button>
          ))}
        </div>
        <input placeholder="Search ticket, customer, service…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:180,background:COLORS.surface,border:`1px solid ${COLORS.border}`,
            borderRadius:8,padding:"7px 12px",color:COLORS.text,fontSize:13,outline:"none"}} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{textAlign:"center",color:COLORS.muted,padding:60}}>Loading…</div>
      ) : sorted.length === 0 ? (
        <div style={{textAlign:"center",color:COLORS.muted,padding:60}}>No tickets found.</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${COLORS.border}`}}>
                {[["ticket_number","#"],["customer_name","Customer"],["service_name","Service"],
                  ["status","Status"],["created_at","Joined At"],["updated_at","Served At"],["duration","Duration"]].map(([f,l])=>(
                  <th key={f} onClick={()=>toggleSort(f)} style={{
                    textAlign:"left",padding:"10px 14px",color:COLORS.subtle,fontWeight:600,
                    fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",
                    userSelect:"none",background:COLORS.surface,whiteSpace:"nowrap",
                  }}>{l}<SortIcon f={f}/></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t,i)=>(
                <tr key={t.id} style={{borderBottom:`1px solid ${COLORS.border}`,background:i%2===0?COLORS.card:COLORS.surface}}>
                  <td style={{padding:"11px 14px",color:COLORS.accent,fontWeight:700}}>#{t.ticket_number}</td>
                  <td style={{padding:"11px 14px",color:COLORS.text,fontWeight:500}}>{t.customer_name||"—"}</td>
                  <td style={{padding:"11px 14px",color:COLORS.subtle}}>{t.service_name||"—"}</td>
                  <td style={{padding:"11px 14px"}}><Badge status={t.status}/></td>
                  <td style={{padding:"11px 14px",color:COLORS.muted,fontSize:12,whiteSpace:"nowrap"}}>{fmt(t.created_at)}</td>
                  <td style={{padding:"11px 14px",color:COLORS.muted,fontSize:12,whiteSpace:"nowrap"}}>{t.updated_at?fmt(t.updated_at):"—"}</td>
                  <td style={{padding:"11px 14px"}}>
                    {duration(t)==="—"
                      ? <span style={{color:COLORS.muted}}>—</span>
                      : <span style={{background:`${COLORS.green}18`,color:COLORS.green,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:600}}>{duration(t)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && <div style={{marginTop:10,color:COLORS.muted,fontSize:12,textAlign:"right"}}>Showing {sorted.length} of {tickets.length} tickets</div>}
    </div>
  );
}

// ── AdminCustomers ───────────────────────────────────────────────
function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("GET", "/api/customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch { setCustomers([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await apiFetch("DELETE", `/api/customers/${id}`);
      setToast({ msg: "Customer deleted", type: "success" });
      load();
    } catch (e) { setToast({ msg: e.message, type: "error" }); }
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:COLORS.text}}>Manage Customers</h1>
        <p style={{color:COLORS.muted,fontSize:13,marginTop:4}}>View, search, and delete customer accounts.</p>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
        <input placeholder="Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,background:COLORS.surface,border:`1px solid ${COLORS.border}`,borderRadius:8,
            padding:"8px 12px",color:COLORS.text,fontSize:13,outline:"none"}} />
      </div>

      {loading ? <div style={{textAlign:"center",color:COLORS.muted,padding:60}}>Loading…</div> : (
        <div style={{overflowX:"auto"}}>
          <table style={{fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${COLORS.border}`}}>
                {["ID","Name","Phone","Registered At","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 14px",color:COLORS.subtle,
                    fontWeight:600,fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",
                    background:COLORS.surface}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c,i)=>(
                <tr key={c.id} style={{borderBottom:`1px solid ${COLORS.border}`,background:i%2===0?COLORS.card:COLORS.surface}}>
                  <td style={{padding:"11px 14px",color:COLORS.muted}}>#{c.id}</td>
                  <td style={{padding:"11px 14px",color:COLORS.text,fontWeight:500}}>{c.name}</td>
                  <td style={{padding:"11px 14px",color:COLORS.subtle}}>{c.phone}</td>
                  <td style={{padding:"11px 14px",color:COLORS.muted,fontSize:12}}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <button onClick={()=>deleteCustomer(c.id)} style={{
                      background:`${COLORS.red}18`,color:COLORS.red,border:`1px solid ${COLORS.red}44`,
                      borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontWeight:600,
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={5} style={{padding:40,textAlign:"center",color:COLORS.muted}}>No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── AdminServices ────────────────────────────────────────────────
function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [form,     setForm]     = useState({ name:"", estimated_time:"" });
  const [editing,  setEditing]  = useState(null); // service being edited

  const load = async () => {
    setLoading(true);
    const data = await api.getServices();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addService = async () => {
    if (!form.name || !form.estimated_time) return setToast({msg:"Name and time required",type:"error"});
    try {
      await apiFetch("POST", "/api/services", { name: form.name, estimated_time: parseInt(form.estimated_time) });
      setToast({msg:"Service added",type:"success"});
      setForm({name:"",estimated_time:""});
      load();
    } catch (e) { setToast({msg:e.message,type:"error"}); }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await apiFetch("DELETE", `/api/services/${id}`);
      setToast({msg:"Service deleted",type:"success"});
      load();
    } catch (e) { setToast({msg:e.message,type:"error"}); }
  };

  const updateService = async (id) => {
    try {
      await apiFetch("PUT", `/api/services/${id}`, { name: editing.name, estimated_time: parseInt(editing.estimated_time) });
      setToast({msg:"Service updated",type:"success"});
      setEditing(null);
      load();
    } catch (e) { setToast({msg:e.message,type:"error"}); }
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:COLORS.text}}>Manage Services</h1>
        <p style={{color:COLORS.muted,fontSize:13,marginTop:4}}>Add, update, or delete available services.</p>
      </div>

      {/* Add service form */}
      <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 20px",marginBottom:24}}>
        <div style={{color:COLORS.subtle,fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>Add New Service</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 160px auto",gap:10,alignItems:"flex-end"}}>
          <div>
            <label style={{display:"block",fontSize:12,color:COLORS.subtle,marginBottom:5,fontWeight:500}}>Service Name</label>
            <input placeholder="e.g. Passport Services" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              style={{width:"100%",background:COLORS.surface,border:`1px solid ${COLORS.border}`,borderRadius:8,
                padding:"9px 12px",color:COLORS.text,fontSize:13,outline:"none",boxSizing:"border-box"}} />
          </div>
          <div>
            <label style={{display:"block",fontSize:12,color:COLORS.subtle,marginBottom:5,fontWeight:500}}>Est. Time (min)</label>
            <input placeholder="10" type="number" value={form.estimated_time} onChange={e=>setForm(f=>({...f,estimated_time:e.target.value}))}
              style={{width:"100%",background:COLORS.surface,border:`1px solid ${COLORS.border}`,borderRadius:8,
                padding:"9px 12px",color:COLORS.text,fontSize:13,outline:"none",boxSizing:"border-box"}} />
          </div>
          <button onClick={addService} style={{background:COLORS.accent,color:"#fff",border:"none",borderRadius:8,
            padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
        </div>
      </div>

      {/* Services list */}
      {loading ? <div style={{textAlign:"center",color:COLORS.muted,padding:40}}>Loading…</div> : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {services.map(s=>(
            <div key={s.id} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,
              padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              {editing?.id === s.id ? (
                <>
                  <input value={editing.name} onChange={e=>setEditing(ed=>({...ed,name:e.target.value}))}
                    style={{flex:1,background:COLORS.surface,border:`1px solid ${COLORS.accent}`,borderRadius:7,
                      padding:"7px 10px",color:COLORS.text,fontSize:13,outline:"none"}} />
                  <input value={editing.estimated_time} onChange={e=>setEditing(ed=>({...ed,estimated_time:e.target.value}))}
                    type="number" style={{width:80,background:COLORS.surface,border:`1px solid ${COLORS.accent}`,borderRadius:7,
                      padding:"7px 10px",color:COLORS.text,fontSize:13,outline:"none"}} />
                  <button onClick={()=>updateService(s.id)} style={{background:COLORS.green,color:"#fff",border:"none",
                    borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{background:"transparent",color:COLORS.muted,border:`1px solid ${COLORS.border}`,
                    borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Cancel</button>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <div style={{color:COLORS.text,fontWeight:600,fontSize:14}}>{s.name}</div>
                    <div style={{color:COLORS.muted,fontSize:12,marginTop:2}}>~{s.estimated_time} min per customer</div>
                  </div>
                  <button onClick={()=>setEditing({id:s.id,name:s.name,estimated_time:s.estimated_time})}
                    style={{background:`${COLORS.accent}18`,color:COLORS.accent,border:`1px solid ${COLORS.accent}33`,
                      borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>deleteService(s.id)} style={{background:`${COLORS.red}18`,color:COLORS.red,
                    border:`1px solid ${COLORS.red}33`,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Delete</button>
                </>
              )}
            </div>
          ))}
          {services.length===0 && <div style={{textAlign:"center",color:COLORS.muted,padding:40}}>No services found.</div>}
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── AdminMonitor ─────────────────────────────────────────────────
function AdminMonitor() {
  const [queue,   setQueue]   = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getQueue();
      setQueue(data.queue);
      setTickets(data.tickets || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  const waiting   = tickets.filter(t=>t.status==="waiting").length;
  const inProg    = tickets.filter(t=>t.status==="in_progress").length;
  const completed = tickets.filter(t=>t.status==="completed").length;
  const current   = tickets.find(t=>t.status==="in_progress");

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:COLORS.text}}>Monitor Queue</h1>
        <p style={{color:COLORS.muted,fontSize:13,marginTop:4}}>
          Live read-only view of the queue. Auto-refreshes every 5 seconds.
          <span style={{marginLeft:8,color:queue?.status==="active"?COLORS.green:COLORS.orange,fontWeight:600}}>
            ● {queue?.status==="active"?"Active":"Paused"}
          </span>
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {[
          {label:"Waiting",     value:waiting,   color:COLORS.gold  },
          {label:"In Service",  value:inProg,    color:COLORS.accent},
          {label:"Completed",   value:completed, color:COLORS.green },
        ].map(s=>(
          <div key={s.label} style={{background:COLORS.card,borderRadius:10,border:`1px solid ${COLORS.border}`,padding:"16px 20px"}}>
            <div style={{fontSize:12,color:COLORS.muted,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {current && (
        <div style={{background:`linear-gradient(135deg,${COLORS.accentDim}22,${COLORS.accent}11)`,
          border:`1px solid ${COLORS.accent}44`,borderRadius:12,padding:"16px 24px",marginBottom:20,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:12,color:COLORS.accent,fontWeight:600,letterSpacing:"0.08em",marginBottom:4}}>NOW SERVING</div>
            <div style={{fontSize:22,fontWeight:700,color:COLORS.text}}>Ticket #{current.ticket_number} — {current.customer_name}</div>
            <div style={{fontSize:13,color:COLORS.subtle,marginTop:2}}>{current.service_name}</div>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {tickets.filter(t=>t.status==="waiting").map(t=>(
          <div key={t.id} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,
            padding:"12px 18px",display:"flex",alignItems:"center",gap:14,
            borderLeft:`3px solid ${COLORS.gold}`}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:COLORS.surface,display:"flex",
              alignItems:"center",justifyContent:"center",fontWeight:700,color:COLORS.accent,flexShrink:0}}>
              #{t.ticket_number}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,color:COLORS.text,fontSize:14}}>{t.customer_name}</div>
              <div style={{fontSize:12,color:COLORS.muted,marginTop:2}}>{t.service_name}</div>
            </div>
            <Badge status={t.status}/>
          </div>
        ))}
        {tickets.filter(t=>t.status==="waiting").length===0 && !loading && (
          <div style={{textAlign:"center",color:COLORS.muted,padding:40}}>No customers waiting.</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user,     setUser]     = useState(() => Auth.getUser());
  const [loggedIn, setLoggedIn] = useState(() => Auth.isLoggedIn());
  const [view,     setView]     = useState("operator");

  const handleLogin  = (u) => { setUser(u); setLoggedIn(true); setView("operator"); };
  const handleLogout = () => {
    Auth.removeToken(); Auth.removeUser();
    setUser(null); setLoggedIn(false);
  };

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  // Admin gets their own portal
  if (user?.role === "admin") return <AdminPortal user={user} onLogout={handleLogout} />;

  // Operator portal
  const navItems = [
    { id: "operator", label: "Operator",     icon: "\u{1F39B}\uFE0F" },
    { id: "customer", label: "Customer",     icon: "\u{1F464}" },
    { id: "display",  label: "Live Display", icon: "\u{1F4FA}" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: COLORS.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #694747; }
        select option { background: #d6dff7; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }
        @keyframes slideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0B0F1A; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 3px; }
      `}</style>

      <div style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 32px", display: "flex", alignItems: "center", height: 56, gap: 32,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, letterSpacing: "-0.02em" }}>
          <span style={{ color: COLORS.accent }}>Q</span>ueue<span style={{ color: COLORS.accent }}>.</span>io
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              background: view === n.id ? `${COLORS.accent}22` : "transparent",
              color: view === n.id ? COLORS.accent : COLORS.muted,
              border: "none", borderRadius: 8, padding: "6px 16px",
              fontSize: 13, cursor: "pointer", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.muted }}>
            👤 <span style={{ color: COLORS.subtle, fontWeight: 600 }}>{user?.username}</span>
            <span style={{ marginLeft: 6, background: `${COLORS.accent}22`, color: COLORS.accent,
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>OPERATOR</span>
          </div>
          <button onClick={handleLogout} style={{
            background: "transparent", border: `1px solid ${COLORS.border}`,
            borderRadius: 7, padding: "5px 12px", color: COLORS.muted,
            fontSize: 12, cursor: "pointer", fontWeight: 500,
          }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        {view === "operator" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>Operator Dashboard</h1>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Manage the live queue, call customers, and handle walk-ins.</p>
            </div>
            <OperatorDashboard />
          </>
        )}
        {view === "customer" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>Customer Portal</h1>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Book your spot in the queue or track an existing ticket.</p>
            </div>
            <CustomerBooking />
          </>
        )}
        {view === "display" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>Live Queue Display</h1>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>Public-facing display — auto-refreshes every 4 seconds.</p>
            </div>
            <LiveDisplay />
          </>
        )}
      </div>
    </div>
  );
}
