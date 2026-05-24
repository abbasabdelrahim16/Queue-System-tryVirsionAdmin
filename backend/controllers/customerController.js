// controllers/customerController.js
const Customer     = require('../models/Customer');
const QueueTicket  = require('../models/QueueTicket');
const Queue        = require('../models/Queue');
const Notification = require('../models/Notification');
const { pool }     = require('../config/db');
const { success, fail, calcWaitTime } = require('../utils/helpers');

// ── GET /api/customers ────────────────────────────────────────────────────
async function listCustomers(req, res, next) {
  try {
    const customers = await Customer.findAll();
    success(res, customers);
  } catch (err) { next(err); }
}

// ── POST /api/customers ───────────────────────────────────────────────────
async function createCustomer(req, res, next) {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return fail(res, 'name and phone are required');

    const customer = await Customer.create({ name, phone });
    success(res, customer, 201, 'Customer created');
  } catch (err) { next(err); }
}

// ── POST /api/customers/book ──────────────────────────────────────────────
/**
 * Book a queue ticket.
 * Body: { customer_id, service_id, queue_id }
 *
 * Business logic:
 *   1. Validate customer, service, queue
 *   2. Check queue is active
 *   3. Assign ticket_number = last + 1
 *   4. Insert ticket
 *   5. Calculate estimated wait
 *   6. Return ticket details
 */
async function bookQueue(req, res, next) {
  try {
    const { customer_id, service_id, queue_id } = req.body || {};
    if (!customer_id || !service_id || !queue_id)
      return fail(res, 'customer_id, service_id, queue_id are required');

    // Validate entities
    const [custRows]    = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    const [svcRows]     = await pool.query('SELECT * FROM services  WHERE id = ?', [service_id]);
    const queue         = await Queue.findById(queue_id);

    if (!custRows[0])   return fail(res, 'Customer not found', 404);
    if (!svcRows[0])    return fail(res, 'Service not found', 404);
    if (!queue)         return fail(res, 'Queue not found', 404);
    if (queue.status === 'paused')
      return fail(res, 'Queue is currently paused. Please try again later.', 409);

    const service      = svcRows[0];
    const lastNum      = await QueueTicket.getLastTicketNumber(queue_id);
    const ticketNumber = lastNum + 1;

    const ticketId     = await QueueTicket.create({
      ticketNumber,
      customerId: customer_id,
      serviceId:  service_id,
      queueId:    queue_id,
    });

    // Calculate position = all waiting tickets including this one
    const position    = await QueueTicket.getPosition(ticketId, queue_id);
    const waitMinutes = calcWaitTime(position, service.estimated_time);

    await Notification.create(
      customer_id,
      `Your booking is confirmed! Ticket #${ticketNumber} – estimated wait: ${waitMinutes} min.`
    );
    const io = req.app.get("io");

io.emit("new-ticket", {
  message: "New ticket booked",
  ticket_number: ticketNumber,
  queue_id: queue_id
});

    success(res, {
      ticket_id:      ticketId,
      ticket_number:  ticketNumber,
      queue_position: position,
      estimated_wait: `${waitMinutes} minutes`,
      service:        service.name,
      queue:          queue.name,
    }, 201, 'Ticket booked successfully');

  } catch (err) { next(err); }
}

// ── GET /api/customers/track/:ticketId ────────────────────────────────────
/**
 * Track a ticket's real-time position and estimated wait.
 */
async function trackQueue(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await QueueTicket.findById(ticketId);

    if (!ticket) return fail(res, 'Ticket not found', 404);

    if (ticket.status !== 'waiting') {
      return success(res, {
        ticket_number: ticket.ticket_number,
        status:        ticket.status,
        message:       `Ticket is currently: ${ticket.status}`,
      });
    }

    const position    = await QueueTicket.getPosition(ticketId, ticket.queue_id);
    const waitMinutes = calcWaitTime(position, ticket.estimated_time);

    success(res, {
      ticket_number:   ticket.ticket_number,
      status:          ticket.status,
      customer_name:   ticket.customer_name,
      service_name:    ticket.service_name,
      queue_name:      ticket.queue_name,
      queue_position:  position,
      estimated_wait:  `${waitMinutes} minutes`,
    });
  } catch (err) { next(err); }
}

// ── DELETE /api/customers/cancel/:ticketId ────────────────────────────────
async function cancelBooking(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await QueueTicket.findById(ticketId);

    if (!ticket) return fail(res, 'Ticket not found', 404);
    if (ticket.status !== 'waiting')
      return fail(res, `Cannot cancel a ticket with status: ${ticket.status}`, 409);

    const cancelled = await QueueTicket.cancel(ticketId);
    if (!cancelled) return fail(res, 'Cancellation failed', 500);

    await Notification.create(
      ticket.customer_id,
      `Your ticket #${ticket.ticket_number} has been cancelled.`
    );

    success(res, { ticket_id: ticketId, status: 'cancelled' }, 200, 'Ticket cancelled');
  } catch (err) { next(err); }
}

// ── GET /api/customers/:id/notifications ─────────────────────────────────
async function getNotifications(req, res, next) {
  try {
    const { id } = req.params;
    const notifications = await Notification.findByCustomer(id);
    success(res, notifications);
  } catch (err) { next(err); }
}


async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications WHERE customer_id = ?', [id]);
    await pool.query('DELETE FROM queue_tickets WHERE customer_id = ?', [id]);
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    success(res, { id }, 200, 'Customer deleted');
  } catch (err) { next(err); }
}

async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications  WHERE customer_id = ?', [id]);
    await pool.query('DELETE FROM queue_tickets  WHERE customer_id = ?', [id]);
    await pool.query('DELETE FROM customers      WHERE id = ?',          [id]);
    success(res, { id: parseInt(id) }, 200, 'Customer deleted');
  } catch (err) { next(err); }
}

module.exports = { listCustomers, createCustomer, bookQueue, trackQueue, cancelBooking, getNotifications, deleteCustomer };