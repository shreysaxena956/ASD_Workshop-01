const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware } = require('../middleware/cache');

// GET /products with cache middleware
router.get('/', cacheMiddleware, productController.getProducts);

// GET /products/:id with cache middleware
router.get('/:id', cacheMiddleware, productController.getProductById);

// POST /products
router.post('/', productController.createProduct);

// PUT /products/:id
router.put('/:id', productController.updateProduct);

// PATCH /products/:id
router.patch('/:id', productController.updateProduct);

// DELETE /products/:id
router.delete('/:id', productController.deleteProduct);

module.exports = router;
