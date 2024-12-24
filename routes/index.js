const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const chatRoutes = require('./chatRoutes');

router.use('/api/users', userRoutes);
router.use('/api', chatRoutes);

module.exports = router;
