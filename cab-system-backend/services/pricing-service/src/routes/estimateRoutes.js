const express = require('express');
const router = express.Router();
const { estimateFare } = require('../controllers/estimateController');

router.post('/', estimateFare);

module.exports = router;