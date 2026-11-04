const express = require('express');
const multer = require('multer');
const productsController = require('../controllers/productsController');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.post('/', upload.array('photos', 10), productsController.createProduct);
router.put('/:id', upload.array('photos', 10), productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

// Handle upload errors (for example a file that is not an image)
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

module.exports = router;