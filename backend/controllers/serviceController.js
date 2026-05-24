const { pool }  = require('../config/db');
const Queue     = require('../models/Queue');
const { success, fail } = require('../utils/helpers');

// ── GET /api/services ────────────────────────────────────────────
async function listServices(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY name ASC');
    success(res, rows);
  } catch (err) { next(err); }
}

// ── GET /api/queues ──────────────────────────────────────────────
async function listQueues(req, res, next) {
  try {
    const queues = await Queue.findAll();
    success(res, queues);
  } catch (err) { next(err); }
}

// ── POST /api/services ───────────────────────────────────────────
async function addService(req, res, next) {
  try {
    const { name, estimated_time } = req.body;
    if (!name || !estimated_time) return fail(res, 'name and estimated_time are required');
    const [result] = await pool.query(
      'INSERT INTO services (name, estimated_time) VALUES (?, ?)',
      [name, parseInt(estimated_time)]
    );
    success(res, { id: result.insertId, name, estimated_time: parseInt(estimated_time) }, 201, 'Service added');
  } catch (err) { next(err); }
}

// ── PUT /api/services/:id ────────────────────────────────────────
async function updateService(req, res, next) {
  try {
    const { name, estimated_time } = req.body;
    const { id } = req.params;
    if (!name || !estimated_time) return fail(res, 'name and estimated_time are required');
    await pool.query(
      'UPDATE services SET name = ?, estimated_time = ? WHERE id = ?',
      [name, parseInt(estimated_time), id]
    );
    success(res, { id: parseInt(id), name, estimated_time: parseInt(estimated_time) }, 200, 'Service updated');
  } catch (err) { next(err); }
}

// ── DELETE /api/services/:id ─────────────────────────────────────
async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM services WHERE id = ?', [id]);
    success(res, { id: parseInt(id) }, 200, 'Service deleted');
  } catch (err) { next(err); }
}

module.exports = { listServices, listQueues, addService, updateService, deleteService };