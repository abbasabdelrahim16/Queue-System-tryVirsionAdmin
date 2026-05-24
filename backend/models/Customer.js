// models/Customer.js
const { pool } = require('../config/db');

const Customer = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    return rows;
  },

  async create({ name, phone }) {
    const [result] = await pool.query(
      'INSERT INTO customers (name, phone) VALUES (?, ?)',
      [name, phone]
    );
    return { id: result.insertId, name, phone };
  },
};

module.exports = Customer;
