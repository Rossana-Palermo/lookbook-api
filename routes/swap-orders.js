const express = require('express');
const swapOrdersController = require('../controllers/swapOrdersController');

const router = express.Router();

router.get('/', swapOrdersController.getAllSwapOrders);
router.get('/:id', swapOrdersController.getSwapOrderById);
router.post('/', swapOrdersController.createSwapOrder);
router.put('/:id', swapOrdersController.updateSwapOrder);
router.delete('/:id', swapOrdersController.deleteSwapOrder);

module.exports = router;