const express = require('express');
const router = express.Router();
const userController = require('../controller/UserController');
const verifyToken = require('../middleware/verifyToken');

router.post('/create-user', userController.createUser);
router.patch('/change-status', verifyToken, userController.updateStatus);
router.post('/get-distance', verifyToken, userController.userDistance);
router.get('/get-all-users', verifyToken, userController.getUser);


module.exports = router;
