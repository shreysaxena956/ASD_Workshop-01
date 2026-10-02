const productDatabase = require('../database/productDatabase');

// Service function to get all products
async function getAllProducts() {
  return await productDatabase.getAllProducts();
}

// Service function to get a single product by id
async function getProductById(id) {
  return await productDatabase.getProductById(id);
}

// Service function to create a new product
async function createProduct(productData) {
  return await productDatabase.createProduct(productData);
}

// Service function to update a product
async function updateProduct(id, updatedFields) {
  return await productDatabase.updateProduct(id, updatedFields);
}

// Service function to delete a product
async function deleteProduct(id) {
  return await productDatabase.deleteProduct(id);
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
