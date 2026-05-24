// routes/customerRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/customerController');

// Customer management
router.get('/',                    ctrl.listCustomers);
router.post('/',                   ctrl.createCustomer);

// Queue interaction
router.post('/book',               ctrl.bookQueue);
router.get('/track/:ticketId',     ctrl.trackQueue);
router.delete('/cancel/:ticketId', ctrl.cancelBooking);

// Notifications
router.get('/:id/notifications',   ctrl.getNotifications);
router.delete('/:id', ctrl.deleteCustomer);

router.delete('/:id', ctrl.deleteCustomer);

module.exports = router;