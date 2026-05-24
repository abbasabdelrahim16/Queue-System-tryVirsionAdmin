// models/QueueTicket.js
const { pool } = require('../config/db');

const QueueTicket = {
  // ── Reads ────────────────────────────────────────────────────────────────

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT qt.*, c.name AS customer_name, c.phone,
              s.name AS service_name, s.estimated_time,
              q.name AS queue_name, q.status AS queue_status
         FROM queue_tickets qt
         JOIN customers c ON c.id = qt.customer_id
         JOIN services  s ON s.id = qt.service_id
         JOIN queues    q ON q.id = qt.queue_id
        WHERE qt.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByQueue(queueId) {
    const [rows] = await pool.query(
      `SELECT qt.*, c.name AS customer_name, s.name AS service_name
         FROM queue_tickets qt
         JOIN customers c ON c.id = qt.customer_id
         JOIN services  s ON s.id = qt.service_id
        WHERE qt.queue_id = ?
        ORDER BY qt.ticket_number ASC`,
      [queueId]
    );
    return rows;
  },

  /** Returns the position of a waiting ticket (1 = next to be served). */
  async getPosition(ticketId, queueId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS pos
         FROM queue_tickets
        WHERE queue_id = ? AND status = 'waiting'
          AND ticket_number <= (
                SELECT ticket_number FROM queue_tickets WHERE id = ?
              )`,
      [queueId, ticketId]
    );
    return rows[0].pos;
  },

  /** Next waiting ticket in a queue (FIFO). */
  async getNextWaiting(queueId) {
    const [rows] = await pool.query(
      `SELECT * FROM queue_tickets
        WHERE queue_id = ? AND status = 'waiting'
        ORDER BY ticket_number ASC
        LIMIT 1`,
      [queueId]
    );
    return rows[0] || null;
  },

  // ── Writes ───────────────────────────────────────────────────────────────

  async create({ ticketNumber, customerId, serviceId, queueId }) {
    const [result] = await pool.query(
      `INSERT INTO queue_tickets
         (ticket_number, status, customer_id, service_id, queue_id)
       VALUES (?, 'waiting', ?, ?, ?)`,
      [ticketNumber, customerId, serviceId, queueId]
    );
    return result.insertId;
  },

  async updateStatus(id, status) {
    const fields = { status };
    if (status === 'in_progress') fields.start_time = new Date();
    if (status === 'completed')   fields.end_time   = new Date();

    await pool.query('UPDATE queue_tickets SET ? WHERE id = ?', [fields, id]);
  },

  async cancel(id) {
    const [result] = await pool.query(
      "UPDATE queue_tickets SET status = 'cancelled' WHERE id = ? AND status = 'waiting'",
      [id]
    );
    return result.affectedRows > 0;
  },

  /** Highest ticket_number in a queue – used to assign the next one. */
  async getLastTicketNumber(queueId) {
    const [rows] = await pool.query(
      'SELECT MAX(ticket_number) AS max_num FROM queue_tickets WHERE queue_id = ?',
      [queueId]
    );
    return rows[0].max_num || 0;
  },
};

module.exports = QueueTicket;
