const { io } = require("socket.io-client");
const { pool } = require("./config/db");

async function checkUpcomingTickets(io) {

  try {

    const [tickets] = await pool.query(`
      SELECT 
        qt.queue_id,
        qt.id,
        qt.ticket_number,
        qt.customer_id,
        qt.created_at,
        s.estimated_time
      FROM queue_tickets qt
      JOIN services s
        ON qt.service_id = s.id
      WHERE qt.status = 'waiting'
    `);

    for (const ticket of tickets) {

      const [ahead] = await pool.query(`
  SELECT COUNT(*) AS total
  FROM queue_tickets
  WHERE queue_id = ?
  AND status = 'waiting'
  AND ticket_number < ?
`, [
  ticket.queue_id,
  ticket.ticket_number
]);

const peopleAhead = ahead[0].total;

const waitMinutes =
  peopleAhead * ticket.estimated_time;

      // إشعار 20 دقيقة
      if (waitMinutes <= 20 && waitMinutes > 10) {

        await createNotification(
          ticket.customer_id,
          `⏳ Your turn is approaching. About 20 minutes left.`
          ,io
        );

      }
}

  } catch (err) {

    console.error("Notification scheduler error:", err);

  }

}

async function createNotification(customerId, message, io) {

  const [exists] = await pool.query(`
    SELECT id FROM notifications
    WHERE customer_id = ?
    AND message = ?
    LIMIT 1
  `, [customerId, message]);

  // منع التكرار
  if (exists.length > 0) return;

  await pool.query(`
    INSERT INTO notifications
    (customer_id, message)
    VALUES (?, ?)
  `, [customerId, message]);


io.emit("new-notification", {
  customerId,
  message
});}

module.exports = {
  checkUpcomingTickets,
};