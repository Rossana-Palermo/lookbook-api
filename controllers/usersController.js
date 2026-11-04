const pool = require('../db');

// GET /users - list all users
async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM users');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /users/:id - get one user
async function getUserById(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /users - create a user
async function createUser(req, res) {
  const { first_name, last_name, email } = req.body;
  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'first_name, last_name and email are required' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)',
      [first_name, last_name, email]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name, email });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /users/:id - update a user
async function updateUser(req, res) {
  const { first_name, last_name, email } = req.body;
  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'first_name, last_name and email are required' });
  }
  try {
    const [result] = await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [first_name, last_name, email, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ id: Number(req.params.id), first_name, last_name, email });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /users/:id - delete a user
async function deleteUser(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };