const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/serviceController');

router.get('/services',        ctrl.listServices);
router.get('/queues',          ctrl.listQueues);
router.post('/services',       ctrl.addService);
router.put('/services/:id',    ctrl.updateService);
router.delete('/services/:id', ctrl.deleteService);

module.exports = router;