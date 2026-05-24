// models/Notification.js
const { pool } = require('../config/db');

const Notification = {
  async create(customerId, message) {
    const [result] = await pool.query(
      'INSERT INTO notifications (customer_id, message) VALUES (?, ?)',
      [customerId, message]
    );
    return result.insertId;
  },

  async findByCustomer(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );
    return rows;
  },

  async markRead(id) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  },
};

module.exports = Notification;
