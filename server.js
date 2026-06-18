require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parse JSON
app.use(cors());
app.use(express.json());

// Serve frontend static files from the root directory
app.use(express.static(__dirname));

// Initialize Database Connection Pool (supports cloud DATABASE_URL or individual configs)
const pool = process.env.DATABASE_URL
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'pooja',
      database: process.env.DB_NAME || 'rockings_cafe',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ENDPOINTS ---

// 1. GET /api/menu: Fetch all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Database error fetching menu.' });
  }
});

// 2. GET /api/reviews: Fetch all customer reviews sorted by newest
app.get('/api/reviews', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Database error fetching reviews.' });
  }
});

// 3. POST /api/reviews: Add a new review
app.post('/api/reviews', async (req, res) => {
  const { name, stars, comment, review_date } = req.body;
  
  if (!name || !stars || !comment || !review_date) {
    return res.status(400).json({ error: 'Missing required review fields.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO reviews (name, stars, comment, review_date) VALUES (?, ?, ?, ?)',
      [name, stars, comment, review_date]
    );
    res.status(201).json({ 
      message: 'Review saved successfully!',
      reviewId: result.insertId 
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Database error saving review.' });
  }
});

// 4. POST /api/bookings: Create a table reservation
app.post('/api/bookings', async (req, res) => {
  const { name, phone, guests, booking_date, booking_time } = req.body;

  if (!name || !phone || !guests || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (name, phone, guests, booking_date, booking_time) VALUES (?, ?, ?, ?, ?)',
      [name, phone, guests, booking_date, booking_time]
    );
    res.status(201).json({ 
      message: 'Table booked successfully!',
      bookingId: result.insertId 
    });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ error: 'Database error saving table booking.' });
  }
});

// 5. POST /api/orders: Submit virtual cart checkout items (Transaction-safe)
app.post('/api/orders', async (req, res) => {
  const { total_price, items, payment_method, payment_status, transaction_id } = req.body;

  if (!total_price || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required order details or items list.' });
  }

  const method = payment_method || 'cash';
  const payStatus = payment_status || 'pending';
  const transId = transaction_id || null;

  // Get a connection from pool to handle transactions
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert order entry with payment columns
    const [orderResult] = await connection.query(
      'INSERT INTO orders (total_price, status, payment_method, payment_status, transaction_id) VALUES (?, ?, ?, ?, ?)',
      [total_price, 'pending', method, payStatus, transId]
    );
    const orderId = orderResult.insertId;

    // Bulk insert order items
    const queryStr = 'INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES ?';
    const values = items.map(item => [
      orderId,
      item.id,
      item.name,
      item.price,
      item.quantity
    ]);

    await connection.query(queryStr, [values]);

    // Commit Transaction
    await connection.commit();
    console.log(`Order #${orderId} saved [Method: ${method}, Status: ${payStatus}] with ${items.length} items. Total: ₹${total_price}`);
    res.status(201).json({ 
      message: 'Order recorded successfully!',
      orderId: orderId,
      transactionId: transId
    });
  } catch (error) {
    // Rollback on error
    await connection.rollback();
    console.error('Transaction failed. Order cancelled:', error);
    res.status(500).json({ error: 'Database error placing your order.' });
  } finally {
    connection.release();
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 RocKings Cafe API Server is running on port ${PORT}`);
});
