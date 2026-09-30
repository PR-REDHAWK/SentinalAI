const express = require('express');
const router = express.Router();
const shopServices = require('../services/shopServices');

router.get('/products', async (req, res) => {
  try {
    const products = await shopServices.getProducts();
    res.json(products);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await shopServices.getProductById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { items, payment } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    const order = await shopServices.checkout(items, payment || {});
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await shopServices.getOrders();
    res.json(orders);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const auth = await shopServices.login(email, password);
    res.json(auth);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
