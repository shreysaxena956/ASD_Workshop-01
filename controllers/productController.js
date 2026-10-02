const productService = require('../services/productService');
const { setCache, clearCache } = require('../middleware/cache');

// GET /products
async function getProducts(req, res) {
  try {
    const products = await productService.getAllProducts();
    const key = req.originalUrl || req.url;
    setCache(key, products);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

// GET /products/:id
async function getProductById(req, res) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const key = req.originalUrl || req.url;
    setCache(key, product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

// POST /products
async function createProduct(req, res) {
  try {
    const newProduct = await productService.createProduct(req.body);
    clearCache();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
}

// PUT or PATCH /products/:id
async function updateProduct(req, res) {
  try {
    const updatedProduct = await productService.updateProduct(req.params.id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    clearCache();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
}

// DELETE /products/:id
async function deleteProduct(req, res) {
  try {
    const deletedProduct = await productService.deleteProduct(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    clearCache();
    res.json({ message: 'Product deleted', product: deletedProduct });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
