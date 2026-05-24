/**
 * Shared API client — Queue Management System
 *
 * Used by BOTH:
 *   - Web dashboard  (Vite + React, runs at http://localhost:5173)
 *   - Mobile app     (React Native / Expo, calls the same backend)
 *
 * Backend base URL: http://localhost:5000
 *
 * To switch environments set the BASE_URL constant or pass it via
 * an environment variable:
 *   Web  → Vite:  import.meta.env.VITE_API_URL
 *   RN   → Expo:  process.env.EXPO_PUBLIC_API_URL
 */

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
  "http://localhost:5000";

async function request(method, path, body) {
  const token = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Im9wZXJhdG9yIiwiaWF0IjoxNzc5Mzc0NTYyLCJleHAiOjE3Nzk5NzkzNjJ9.f1riCDVi-gGgLYx4Om0VXKfu2TZejT-PvzSjdABW0-A";

const opts = {
  method,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
};
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

const get  = (path)        => request("GET",    path);
const post = (path, body)  => request("POST",   path, body);
const del  = (path)        => request("DELETE", path);

/* ─── Services & Queues ──────────────────────────────────────────── */

/** GET /api/services  → [{ id, name, estimated_time }] */
export const fetchServices = () => get("/api/services");

/** GET /api/queues    → [{ id, name, status, current_number }] */
export const fetchQueues   = () => get("/api/queues");


/* ─── Customer endpoints ─────────────────────────────────────────── */

/**
 * POST /api/customers
 * body: { name, phone }
 * → { id, name, phone, created_at }
 */
export const createCustomer = (name, phone) =>
  post("/api/customers", { name, phone });

/**
 * POST /api/customers/book
 * body: { customer_id, service_id, queue_id }
 * → { ticket_id, ticket_number, queue_position, estimated_wait, service, queue }
 */
export const bookTicket = (customer_id, service_id, queue_id) =>
  post("/api/customers/book", { customer_id, service_id, queue_id });

/**
 * GET /api/customers/track/:ticketId
 * → { ticket_number, status, customer_name, service_name,
 *     queue_name, queue_position, estimated_wait }
 */
export const trackTicket = (ticketId) =>
  get(`/api/customers/track/${ticketId}`);

/**
 * DELETE /api/customers/cancel/:ticketId
 * → { ticket_id, status: "cancelled" }
 */
export const cancelTicket = (ticketId) =>
  del(`/api/customers/cancel/${ticketId}`);

/**
 * GET /api/customers/:id/notifications
 * → [{ id, message, is_read, created_at }]
 */
export const fetchNotifications = (customerId) =>
  get(`/api/customers/${customerId}/notifications`);


/* ─── Operator endpoints (web dashboard only) ────────────────────── */

/** GET  /api/operator/queue/:queueId  → { queue, tickets[] } */
export const fetchQueue    = (queueId)  => get(`/api/operator/queue/${queueId}`);

/** POST /api/operator/queue/:queueId/call-next */
export const callNext      = (queueId)  => post(`/api/operator/queue/${queueId}/call-next`);

/** POST /api/operator/queue/:queueId/pause  */
export const pauseQueue    = (queueId)  => post(`/api/operator/queue/${queueId}/pause`);

/** POST /api/operator/queue/:queueId/resume */
export const resumeQueue   = (queueId)  => post(`/api/operator/queue/${queueId}/resume`);

/** POST /api/operator/queue/:queueId/walk-in  body:{ name,phone,service_id,queue_id } */
export const addWalkIn     = (queueId, body) => post(`/api/operator/queue/${queueId}/walk-in`, body);

/** POST /api/operator/ticket/:ticketId/end-service */
export const endService    = (ticketId) => post(`/api/operator/ticket/${ticketId}/end-service`);
