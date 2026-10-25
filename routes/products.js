const express = require('express');
const multer = require('multer');
const pool = require('../db');

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

async function getPhotos(productId) {
  const [photos] = await pool.execute(
    'SELECT id, file_path FROM product_photos WHERE product_id = ?',
    [productId]
  );
  return photos;
}

// GET /products - list all products with their photos
router.get('/', async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT * FROM products');
    for (const product of products) {
      product.photos = await getPhotos(product.id);
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /products/:id - get one product with its photos
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = rows[0];
    product.photos = await getPhotos(product.id);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /products - create a product (form-data: name, user_id, photos)
router.post('/', upload.array('photos', 10), async (req, res) => {
  const { name, user_id } = req.body;
  if (!name || !user_id) {
    return res.status(400).json({ error: 'name and user_id are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO products (name, user_id) VALUES (?, ?)',
      [name, user_id]
    );
    const productId = result.insertId;
    for (const file of req.files) {
      await pool.execute(
        'INSERT INTO product_photos (product_id, file_path) VALUES (?, ?)',
        [productId, `/uploads/${file.filename}`]
      );
    }
    const product = { id: productId, name, user_id: Number(user_id) };
    product.photos = await getPhotos(productId);
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /products/:id - update a product (form-data: name, optional new photos)
router.put('/:id', upload.array('photos', 10), async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const [result] = await pool.execute(
      'UPDATE products SET name = ? WHERE id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    for (const file of req.files) {
      await pool.execute(
        'INSERT INTO product_photos (product_id, file_path) VALUES (?, ?)',
        [req.params.id, `/uploads/${file.filename}`]
      );
    }
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const product = rows[0];
    product.photos = await getPhotos(product.id);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /products/:id - delete a product
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle upload errors (for example a file that is not an image)
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

module.exports = router;