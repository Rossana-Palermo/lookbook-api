const pool = require('../db');

async function getPhotos(productId) {
  const [photos] = await pool.execute(
    'SELECT id, file_path FROM product_photos WHERE product_id = ?',
    [productId]
  );
  return photos;
}

// GET /products - list all products with their photos (2 queries in total)
async function getAllProducts(req, res) {
  try {
    const [products] = await pool.execute('SELECT * FROM products');
    const [photos] = await pool.execute(
      'SELECT id, product_id, file_path FROM product_photos'
    );

    const photosByProduct = {};
    for (const photo of photos) {
      if (!photosByProduct[photo.product_id]) {
        photosByProduct[photo.product_id] = [];
      }
      photosByProduct[photo.product_id].push({ id: photo.id, file_path: photo.file_path });
    }

    for (const product of products) {
      product.photos = photosByProduct[product.id] || [];
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /products/:id - get one product with its photos
async function getProductById(req, res) {
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
}

// POST /products - create a product (form-data: name, user_id, photos)
async function createProduct(req, res) {
  const { name, user_id } = req.body;
  if (!name || !user_id) {
    return res.status(400).json({ error: 'name and user_id are required' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO products (name, user_id) VALUES (?, ?)',
      [name, user_id]
    );
    const productId = result.insertId;
    for (const file of req.files) {
      await connection.execute(
        'INSERT INTO product_photos (product_id, file_path) VALUES (?, ?)',
        [productId, `/uploads/${file.filename}`]
      );
    }
    await connection.commit();

    const product = { id: productId, name, user_id: Number(user_id) };
    product.photos = await getPhotos(productId);
    res.status(201).json(product);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
}

// PUT /products/:id - update a product (form-data: name, optional new photos)
async function updateProduct(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'UPDATE products SET name = ? WHERE id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    for (const file of req.files) {
      await connection.execute(
        'INSERT INTO product_photos (product_id, file_path) VALUES (?, ?)',
        [req.params.id, `/uploads/${file.filename}`]
      );
    }
    await connection.commit();

    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const product = rows[0];
    product.photos = await getPhotos(product.id);
    res.status(200).json(product);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
}

// DELETE /products/:id - delete a product
async function deleteProduct(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};