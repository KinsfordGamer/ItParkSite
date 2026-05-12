const express = require('express');
const router = express.Router();
const { getPayments, createPayment, deletePayment, getPaymentStats } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/stats', getPaymentStats);
router.route('/').get(getPayments).post(createPayment);
router.delete('/:id', adminOnly, deletePayment);

module.exports = router;
