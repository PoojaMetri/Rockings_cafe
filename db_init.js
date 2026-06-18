require('dotenv').config();
const mysql = require('mysql2/promise');



async function initDB() {
  let connection;
  try {
    if (process.env.DATABASE_URL) {
      console.log('Connecting to Cloud MySQL database using DATABASE_URL...');
      connection = await mysql.createConnection(process.env.DATABASE_URL);
      console.log('Connected to Cloud MySQL database.');
    } else {
      console.log('Connecting to Local MySQL host...');
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'pooja'
      });
      console.log('Connected to Local MySQL host.');
      
      const dbName = process.env.DB_NAME || 'rockings_cafe';
      console.log(`Creating database "${dbName}" (if not exists)...`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(`Database "${dbName}" initialized.`);
      
      // Select the database
      await connection.query(`USE \`${dbName}\``);
    }

    // 2. Create tables
    console.log('Creating tables...');

    // Table: menu_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price INT NOT NULL,
        description TEXT,
        image VARCHAR(255),
        diet VARCHAR(20) DEFAULT 'veg',
        is_signature BOOLEAN DEFAULT FALSE
      )
    `);

    // Table: bookings
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        guests INT NOT NULL,
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table: reviews
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stars INT NOT NULL,
        comment TEXT NOT NULL,
        review_date VARCHAR(30) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Drop existing order tables to easily apply schema updates for payments
    console.log('Updating orders schema for payments...');
    await connection.query('DROP TABLE IF EXISTS order_items');
    await connection.query('DROP TABLE IF EXISTS orders');

    // Table: orders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        total_price INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'cash',
        payment_status VARCHAR(50) DEFAULT 'pending',
        transaction_id VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table: order_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        price INT NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    console.log('Tables initialized successfully.');

    // 3. Seed Menu Items
    const [existingItems] = await connection.query('SELECT COUNT(*) as count FROM menu_items');
    if (existingItems[0].count === 0) {
      console.log('Seeding initial menu items...');
      const menuSeeds = [
        ['pasta-1', 'Signature Creamy Pasta', 'food', 320, 'Creamy white penne pasta tossed with fresh zucchini, broccoli, and parsley garnish.', 'assets/pasta.png', 'veg', true],
        ['mocktail-1', 'Dry Ice Golden Mocktail', 'drinks', 220, 'A smoking fizzy citrus mocktail infused with lime, mint, and signature dry ice effect.', 'assets/mocktail.png', 'veg', true],
        ['coffee-1', 'RocKings Premium Macchiato', 'drinks', 240, 'Artisanal espresso shot layer topped with warm steamed milk and craft caramel art.', 'assets/signature_coffee.png', 'veg', true],
        ['burger-1', 'Double Cheese Fusion Burger', 'food', 290, 'Flame-grilled gourmet patty, double cheddar, caramelized onions, fries, and secret sauce.', 'assets/signature_burger.png', 'non-veg', true],
        ['shisha-1', 'Signature Smoked Shisha', 'hookah', 380, 'Premium double-apple hookah blend served in a chilling iced flask base.', 'assets/hookah.png', 'veg', true],
        ['drink-2', 'Amber Gold Craft Brew', 'drinks', 280, 'Refreshing chilled carbonated house brew with aromatic hops and condensed bubbles.', 'assets/golden_drink.png', 'veg', false]
      ];

      for (const item of menuSeeds) {
        await connection.query(
          'INSERT INTO menu_items (id, name, category, price, description, image, diet, is_signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          item
        );
      }
      console.log('Seeded menu items.');
    } else {
      console.log('Menu items already exist, skipping seeding.');
    }

    // 4. Seed Reviews
    const [existingReviews] = await connection.query('SELECT COUNT(*) as count FROM reviews');
    if (existingReviews[0].count === 0) {
      console.log('Seeding initial reviews...');
      const reviewSeeds = [
        ['Rahul Sharma', 5, 'The ambiance is incredible, especially the warm lighting! The hookah and signature pasta are absolute must-tries. Best spot in Yelahanka.', '14 Jun 2026'],
        ['Priyanshi M.', 5, 'Highly recommended cafe behind Essar fuel station. Extremely cozy, peaceful, and perfect for catching up with friends. Friendly staff!', '28 May 2026'],
        ['Vikram K.', 4, 'Awesome mocktails, love the smoking presentation. Food taste is superb and pocket-friendly (around ₹300 per head). Clean and fast service.', '10 May 2026']
      ];

      for (const review of reviewSeeds) {
        await connection.query(
          'INSERT INTO reviews (name, stars, comment, review_date) VALUES (?, ?, ?, ?)',
          review
        );
      }
      console.log('Seeded reviews.');
    } else {
      console.log('Reviews already exist, skipping seeding.');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDB();
