const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/operatorController');
const authMiddleware = require('../middlewares/authMiddleware');


// ===============================
// Queue-level actions
// ===============================

router.get(
  '/queue/:queueId',
  authMiddleware,
  ctrl.viewQueue
);

router.post(
  '/queue/:queueId/call-next',
  authMiddleware,
  ctrl.callNext
);

router.post(
  '/queue/:queueId/pause',
  authMiddleware,
  ctrl.pauseQueue
);

router.post(
  '/queue/:queueId/resume',
  authMiddleware,
  ctrl.resumeQueue
);

router.post(
  '/queue/:queueId/walk-in',
  authMiddleware,
  ctrl.addWalkIn
);


// ===============================
// Ticket-level actions
// ===============================

router.post(
  '/ticket/:ticketId/start-service',
  authMiddleware,
  ctrl.startService
);

router.post(
  '/ticket/:ticketId/end-service',
  authMiddleware,
  ctrl.endService
);

module.exports = router;