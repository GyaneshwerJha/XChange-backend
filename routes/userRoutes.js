const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerConfig = require('../utils/multerConfig');
const { registerUser, loginUser, getUser, postUserContent, updateUserConnections, disconnectUser, getUserConnections, rateUser, getUserRating } = require('../controllers/userController');

router.post('/register', multer(multerConfig).single('profilePic'), registerUser);
router.post('/login', loginUser);
router.get('/:id', getUser);
router.post('/:userId/posts', multer(multerConfig).single('banner'), postUserContent);
router.post('/:userId/connect', updateUserConnections);
router.post('/:userId/disconnect', disconnectUser);
router.get('/:userId/connections', getUserConnections);
router.post('/:userId/rate', rateUser);
router.get('/:userId/rating', getUserRating);

module.exports = router;
