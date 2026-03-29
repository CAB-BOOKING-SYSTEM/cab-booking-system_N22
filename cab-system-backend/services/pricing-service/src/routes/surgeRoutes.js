const express = require('express');
const router = express.Router();
const surgeController = require('../controllers/surgeController');

router.get('/', surgeController.getAllSurges);
router.get('/:zone', surgeController.getSurgeByZone);
router.post('/', surgeController.createSurge);
router.put('/:zone', surgeController.updateSurge);
router.delete('/:zone', surgeController.deleteSurge);

module.exports = router;