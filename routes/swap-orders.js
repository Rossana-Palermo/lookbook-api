const express = require('express');
const pool = require('../db');

const router = express.Router();

async function getOrderDetails(order) {
  const [products] = await pool.execute(
    `SELECT p.id, p.name FROM products p
     JOIN swap_order_products sop ON sop.product_id = p.id
     WHERE sop.swap_order_id = ?`,
    [order.id]
  );
  const [users] = await pool.execute(
    `SELECT u.id, u.first_name, u.last_name, u.email FROM users u
     JOIN swap_order_users sou ON sou.user_id = u.id
     WHERE sou.swap_order_id = ?`,
    [order.id]
  );
  return { ...order, products, users };
}

async function saveLinks(connection, orderId, productIds, userIds) {
  for (const productId of productIds) {
    await connection.execute(
      'INSERT INTO swap_order_products (swap_order_id, product_id) VALUES (?, ?)',
      [orderId, productId]
    );
  }
  for (const userId of userIds) {
    await connection.execute(
      'INSERT INTO swap_order_users (swap_order_id, user_id) VALUES (?, ?)',
      [orderId, userId]
    );
  }
}

function validateBody(body) {
  const { product_ids, user_ids } = body;
  return (
    Array.isArray(product_ids) &&
    Array.isArray(user_ids) &&
    product_ids.length > 0 &&
    user_ids.length > 0
  );
}

function handleLinkError(error, res) {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'One or more products or users do not exist' });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ error: 'Duplicate product or user in the order' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

// GET /swap-orders - list all orders (filters: ?date=YYYY-MM-DD&product_id=1)
router.get('/', async (req, res) => {
  const { date, product_id } = req.query;
  let sql = 'SELECT DISTINCT so.* FROM swap_orders so';
  const conditions = [];
  const params = [];

  if (product_id) {
    sql += ' JOIN swap_order_products sop ON sop.swap_order_id = so.id';
    conditions.push('sop.product_id = ?');
    params.push(product_id);
  }
  if (date) {
    conditions.push('DATE(so.created_at) = ?');
    params.push(date);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY so.created_at DESC';

  try {
    const [orders] = await pool.execute(sql, params);
    const result = [];
    for (const order of orders) {
      result.push(await getOrderDetails(order));
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /swap-orders/:id - get one order
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM swap_orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Swap order not found' });
    }
    res.status(200).json(await getOrderDetails(rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /swap-orders - create an order (body: product_ids, user_ids)
router.post('/', async (req, res) => {
  if (!validateBody(req.body)) {
    return res.status(400).json({ error: 'product_ids and user_ids must be non-empty arrays' });
  }
  const { product_ids, user_ids } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO swap_orders () VALUES ()');
    await saveLinks(connection, result.insertId, product_ids, user_ids);
    await connection.commit();

    const [rows] = await pool.execute('SELECT * FROM swap_orders WHERE id = ?', [result.insertId]);
    res.status(201).json(await getOrderDetails(rows[0]));
  } catch (error) {
    await connection.rollback();
    handleLinkError(error, res);
  } finally {
    connection.release();
  }
});

// PUT /swap-orders/:id - update an order (body: product_ids, user_ids)
router.put('/:id', async (req, res) => {
  if (!validateBody(req.body)) {
    return res.status(400).json({ error: 'product_ids and user_ids must be non-empty arrays' });
  }
  const { product_ids, user_ids } = req.body;
  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.execute('SELECT * FROM swap_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Swap order not found' });
    }
    await connection.beginTransaction();
    await connection.execute('DELETE FROM swap_order_products WHERE swap_order_id = ?', [req.params.id]);
    await connection.execute('DELETE FROM swap_order_users WHERE swap_order_id = ?', [req.params.id]);
    await saveLinks(connection, req.params.id, product_ids, user_ids);
    await connection.commit();

    res.status(200).json(await getOrderDetails(existing[0]));
  } catch (error) {
    await connection.rollback();
    handleLinkError(error, res);
  } finally {
    connection.release();
  }
});

// DELETE /swap-orders/:id - delete an order
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM swap_orders WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Swap order not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;