// models/Queue.js
const { pool } = require('../config/db');

const Queue = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM queues WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM queues ORDER BY id ASC');
    return rows;
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE queues SET status = ? WHERE id = ?', [status, id]);
  },

  async incrementCurrent(id) {
    await pool.query(
      'UPDATE queues SET current_number = current_number + 1 WHERE id = ?',
      [id]
    );
  },

  /** Count waiting tickets in a queue (for position calculation). */
  async countWaiting(queueId) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM queue_tickets WHERE queue_id = ? AND status = 'waiting'",
      [queueId]
    );
    return rows[0].cnt;
  },
};

module.exports = Queue;
