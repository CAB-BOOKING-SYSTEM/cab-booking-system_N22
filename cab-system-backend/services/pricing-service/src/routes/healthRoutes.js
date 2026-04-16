const express = require('express');
const router = express.Router();
const { healthCheck } = require('../health/healthController');

router.get('/', healthCheck);

module.exports = router;