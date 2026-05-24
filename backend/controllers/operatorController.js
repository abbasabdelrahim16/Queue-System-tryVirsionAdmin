const Queue = require('../models/Queue');
const QueueTicket = require('../models/QueueTicket');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');

// ===============================
// 📌 VIEW QUEUE
// ===============================
async function viewQueue(req, res, next) {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ error: "Queue not found" });
    }

    const tickets = await QueueTicket.findByQueue(queueId);

    res.json({
      success: true,
      data: {
        queue,
        tickets
      }
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 CALL NEXT (🔥 مهم)
// ===============================
async function callNext(req, res, next) {
  try {
    const { queueId } = req.params;

    // 1️⃣ تحقق من وجود queue
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ error: "Queue not found" });
    }

    // 2️⃣ تحقق أن queue نشطة
    if (queue.status === "paused") {
      return res.status(409).json({ error: "Queue is paused" });
    }

    // 3️⃣ تحقق أنه لا يوجد ticket in_progress
    const tickets = await QueueTicket.findByQueue(queueId);
    const active = tickets.find(t => t.status === "in_progress");

if (active) {
  // إنهاء التذكرة الحالية تلقائيًا
  await QueueTicket.updateStatus(active.id, "completed");

  const io = req.app.get("io");
  io.emit("ticket-ended", {
    ticket_id: active.id
  });
}

    // 4️⃣ جلب التذكرة التالية
    const nextTicket = await QueueTicket.getNextWaiting(queueId);

    if (!nextTicket) {
      return res.status(404).json({ error: "No waiting tickets" });
    }

    // 5️⃣ تحديث الحالة
    await QueueTicket.updateStatus(nextTicket.id, "in_progress");

    // 6️⃣ تحديث queue current number
    await Queue.incrementCurrent(queueId);

    // 7️⃣ إرسال notification
    await Notification.create(
      nextTicket.customer_id,
      `It's your turn! Ticket #${nextTicket.ticket_number}`
    );

    // 8️⃣ Real-Time 🔥
    const io = req.app.get("io");

    io.emit("queue-update", {
      queue_id: queueId,
      current_ticket: nextTicket.ticket_number
    });

    // 9️⃣ الرد
    return res.json({
      success: true,
      message: "Next ticket called",
      data: nextTicket
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 START SERVICE
// ===============================
async function startService(req, res, next) {
  try {
    const { ticketId } = req.params;

    const ticket = await QueueTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    await QueueTicket.updateStatus(ticketId, "in_progress");

    res.json({
      success: true,
      message: "Service started",
      data: ticket
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 END SERVICE
// ===============================
async function endService(req, res, next) {
  try {
    const { ticketId } = req.params;

    const ticket = await QueueTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    await QueueTicket.updateStatus(ticketId, "completed");

    // Real-Time 🔥
    const io = req.app.get("io");

    io.emit("ticket-ended", {
      ticket_id: ticketId
    });

    res.json({
      success: true,
      message: "Service completed",
      data: ticket
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 PAUSE QUEUE
// ===============================
async function pauseQueue(req, res, next) {
  try {
    const { queueId } = req.params;

    await Queue.updateStatus(queueId, "paused");

    res.json({
      success: true,
      message: "Queue paused"
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 RESUME QUEUE
// ===============================
async function resumeQueue(req, res, next) {
  try {
    const { queueId } = req.params;

    await Queue.updateStatus(queueId, "active");

    res.json({
      success: true,
      message: "Queue resumed"
    });

  } catch (err) {
    next(err);
  }
}

// ===============================
// 📌 ADD WALK-IN CUSTOMER
// ===============================
async function addWalkIn(req, res, next) {
  try {
    const { name, phone, service_id, queue_id } = req.body;

    if (!name || !phone || !service_id || !queue_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // إنشاء customer
    const customer = await Customer.create({ name, phone });

    // حساب ticket number
    const lastNum = await QueueTicket.getLastTicketNumber(queue_id);
    const ticketNumber = lastNum + 1;

    // إنشاء ticket
    const ticketId = await QueueTicket.create({
      ticketNumber,
      customerId: customer.id,
      serviceId: service_id,
      queueId: queue_id
    });

    // Real-Time 🔥
    const io = req.app.get("io");

    io.emit("new-ticket", {
      queue_id,
      ticket_number: ticketNumber
    });

    res.status(201).json({
      success: true,
      message: "Walk-in customer added",
      data: {
        ticket_id: ticketId,
        ticket_number: ticketNumber
      }
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  viewQueue,
  callNext,
  startService,
  endService,
  pauseQueue,
  resumeQueue,
  addWalkIn
};