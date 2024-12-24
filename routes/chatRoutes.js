const express = require('express');
const router = express.Router();
const { getChatHistory, getMessagesForRecipient, getChatUsers } = require('../controllers/userController');

router.get('/chat-history', getChatHistory);
router.get('/messages/recipient', getMessagesForRecipient);
router.get('/chat-users', getChatUsers);

module.exports = router;
