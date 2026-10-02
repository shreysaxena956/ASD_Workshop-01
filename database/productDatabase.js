const fs = require('fs/promises');
const path = require('path');

const filePath = path.join(__dirname, '../db.json');

// Read all data from db.json file
async function readData() {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Write data to db.json file
async function writeData(data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Get all products
async function getAllProducts() {
  return await readData();
}

// Get single product by id
async function getProductById(id) {
  const products = await readData();
  return products.find(p => p.id === Number(id));
}

// Add a new product
async function createProduct(productData) {
  const products = await readData();
  const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const newProduct = { id: nextId, ...productData };
  products.push(newProduct);
  await writeData(products);
  return newProduct;
}

// Update existing product by id
async function updateProduct(id, updatedFields) {
  const products = await readData();
  const index = products.findIndex(p => p.id === Number(id));
  if (index === -1) return null;
  
  products[index] = { ...products[index], ...updatedFields, id: Number(id) };
  await writeData(products);
  return products[index];
}

// Delete product by id
async function deleteProduct(id) {
  const products = await readData();
  const index = products.findIndex(p => p.id === Number(id));
  if (index === -1) return null;
  
  const [deletedProduct] = products.splice(index, 1);
  await writeData(products);
  return deletedProduct;
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
