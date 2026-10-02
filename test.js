const assert = require('assert');
const app = require('./server');
const { cache, TTL, clearCache } = require('./middleware/cache');
const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

// Save initial db state so we can restore after tests
let originalDbContent;

async function runTests() {
  console.log('Starting automated tests...\n');

  originalDbContent = await fs.readFile(dbPath, 'utf-8');

  // Start temporary server for testing
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------
    // Test 1: GET /products (First request -> Cache MISS)
    // -------------------------------------------------------------
    clearCache();
    console.log('Running Test 1: GET /products (First request)...');
    let res1 = await fetch(`${baseUrl}/products`);
    let data1 = await res1.json();
    let cacheHeader1 = res1.headers.get('x-cache');
    
    assert.strictEqual(res1.status, 200, 'Status should be 200');
    assert.strictEqual(cacheHeader1, 'MISS', 'First request X-Cache header must be MISS');
    assert(Array.isArray(data1), 'Response should be an array of products');
    console.log('✓ Test 1 Passed: X-Cache is MISS on first fetch\n');

    // -------------------------------------------------------------
    // Test 2: GET /products (Immediate second request -> Cache HIT)
    // -------------------------------------------------------------
    console.log('Running Test 2: GET /products (Immediate second request)...');
    let res2 = await fetch(`${baseUrl}/products`);
    let data2 = await res2.json();
    let cacheHeader2 = res2.headers.get('x-cache');

    assert.strictEqual(res2.status, 200, 'Status should be 200');
    assert.strictEqual(cacheHeader2, 'HIT', 'Immediate second request X-Cache header must be HIT');
    assert.deepStrictEqual(data2, data1, 'Cached data should match previous response');
    console.log('✓ Test 2 Passed: X-Cache is HIT on immediate repeated fetch\n');

    // -------------------------------------------------------------
    // Test 3: GET /products/1 (First MISS, Second HIT)
    // -------------------------------------------------------------
    clearCache();
    console.log('Running Test 3: GET /products/1 (First MISS, Second HIT)...');
    let res3_miss = await fetch(`${baseUrl}/products/1`);
    let data3_miss = await res3_miss.json();
    let cacheHeader3_miss = res3_miss.headers.get('x-cache');

    assert.strictEqual(res3_miss.status, 200, 'Status should be 200');
    assert.strictEqual(cacheHeader3_miss, 'MISS', 'First GET /products/1 must be MISS');
    assert.strictEqual(data3_miss.id, 1, 'Product id should be 1');

    let res3_hit = await fetch(`${baseUrl}/products/1`);
    let data3_hit = await res3_hit.json();
    let cacheHeader3_hit = res3_hit.headers.get('x-cache');

    assert.strictEqual(res3_hit.status, 200, 'Status should be 200');
    assert.strictEqual(cacheHeader3_hit, 'HIT', 'Second GET /products/1 must be HIT');
    assert.deepStrictEqual(data3_hit, data3_miss, 'Data should match');
    console.log('✓ Test 3 Passed: GET /products/1 is MISS then HIT\n');

    // -------------------------------------------------------------
    // Test 4: Cache invalidation on POST / PUT / PATCH / DELETE
    // -------------------------------------------------------------
    console.log('Running Test 4: Cache invalidation on data modification...');
    
    // Ensure cache currently has /products
    let primeRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(primeRes.headers.get('x-cache'), 'MISS');
    let primeHit = await fetch(`${baseUrl}/products`);
    assert.strictEqual(primeHit.headers.get('x-cache'), 'HIT');

    // 4a. POST /products invalidates cache
    let postRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Webcam', price: 59.99 })
    });
    assert.strictEqual(postRes.status, 201, 'POST should return 201 Created');
    let createdProduct = await postRes.json();

    let afterPostRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(afterPostRes.headers.get('x-cache'), 'MISS', 'GET /products must be MISS after POST');

    // 4b. PUT /products/:id invalidates cache
    await fetch(`${baseUrl}/products`); // HIT
    let putRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HD Webcam', price: 79.99 })
    });
    assert.strictEqual(putRes.status, 200, 'PUT should return 200');

    let afterPutRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(afterPutRes.headers.get('x-cache'), 'MISS', 'GET /products must be MISS after PUT');

    // 4c. PATCH /products/:id invalidates cache
    await fetch(`${baseUrl}/products`); // HIT
    let patchRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 74.99 })
    });
    assert.strictEqual(patchRes.status, 200, 'PATCH should return 200');

    let afterPatchRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(afterPatchRes.headers.get('x-cache'), 'MISS', 'GET /products must be MISS after PATCH');

    // 4d. DELETE /products/:id invalidates cache
    await fetch(`${baseUrl}/products`); // HIT
    let deleteRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'DELETE'
    });
    assert.strictEqual(deleteRes.status, 200, 'DELETE should return 200');

    let afterDeleteRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(afterDeleteRes.headers.get('x-cache'), 'MISS', 'GET /products must be MISS after DELETE');

    console.log('✓ Test 4 Passed: POST, PUT, PATCH, DELETE all successfully invalidate cache\n');

    // -------------------------------------------------------------
    // Test 5: Verify TTL (1-minute expiration)
    // -------------------------------------------------------------
    console.log('Running Test 5: Verify 1-minute TTL expiration...');
    clearCache();
    
    // First request -> MISS
    let freshRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(freshRes.headers.get('x-cache'), 'MISS');

    // Verify immediate next request is HIT
    let cachedRes = await fetch(`${baseUrl}/products`);
    assert.strictEqual(cachedRes.headers.get('x-cache'), 'HIT');

    // Check entry exists in cache
    let cacheEntry = cache.get('/products');
    assert(cacheEntry, 'Cache entry for /products must exist');
    let originalCreatedAt = cacheEntry.createdAt;

    // Simulate expiration by setting createdAt to 61 seconds ago
    cacheEntry.createdAt = Date.now() - (TTL + 1000);

    // Request again -> should be MISS because expired (> 1 minute)
    let expiredRes = await fetch(`${baseUrl}/products`);
    let expiredCacheHeader = expiredRes.headers.get('x-cache');
    assert.strictEqual(expiredCacheHeader, 'MISS', 'Expired cache request must be MISS');

    // Check that cache now contains fresh entry with new timestamp
    let renewedEntry = cache.get('/products');
    assert(renewedEntry, 'Cache should have refreshed entry');
    assert(renewedEntry.createdAt > originalCreatedAt, 'Renewed createdAt must be more recent');

    // Immediate next request should now be HIT
    let immediateHit = await fetch(`${baseUrl}/products`);
    assert.strictEqual(immediateHit.headers.get('x-cache'), 'HIT', 'Next request should be HIT with refreshed cache');

    console.log('✓ Test 5 Passed: Expired entries (> 1 min) are treated as MISS, deleted, and refreshed\n');

    console.log('All tests passed successfully! 🎉');
  } finally {
    // Restore original db.json content
    if (originalDbContent) {
      await fs.writeFile(dbPath, originalDbContent, 'utf-8');
    }
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
