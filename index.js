const express = require('express');
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const swapOrdersRouter = require('./routes/swap-orders');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the LookBook API' });
});

app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/swap-orders', swapOrdersRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});