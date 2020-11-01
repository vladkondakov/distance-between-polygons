const router = require('express').Router();
const controllers = require('../controllers')

router.get('/upload', controllers.getUploadPage)
router.post('/upload', controllers.uploadFileData)
router.get('/', controllers.getPolygons)
router.get('/minksum', controllers.getMinkSum)
router.get('/distance', controllers.getDistance)

module.exports = router