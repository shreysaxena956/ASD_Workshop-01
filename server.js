const express = require('express');
const productRoutes = require('./routes/productRoutes');

const app = express();
const port = 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Mount product routes under /products
app.use('/products', productRoutes);

// Only listen if executed directly (e.g. node server.js)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;