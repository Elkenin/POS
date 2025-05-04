# POS System Documentation

## Prerequisites
1. Install XAMPP
   - Download and install XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
   - Start Apache and MySQL services from XAMPP Control Panel

2. Install Node.js
   - Download and install Node.js from [https://nodejs.org/](https://nodejs.org/)
   - Choose the LTS (Long Term Support) version

## Setup Instructions

### 1. Database Setup
1. Open XAMPP Control Panel and start MySQL service
2. Open MySQL Workbench or phpMyAdmin (http://localhost/phpmyadmin)
3. Execute the following SQL commands:

```sql
CREATE DATABASE IF NOT EXISTS pos_system;

USE pos_system;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    cost_price DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(36) PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    refunded BOOLEAN DEFAULT FALSE,
    refund_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

### 2. Project Setup
1. Open terminal/command prompt in the project directory
2. Install project dependencies:
   ```bash
   npm install
   ```
   This will install all required packages including:
   - mysql2
   - sequelize
   - dotenv
   - express
   - cors
   - nodemon (dev dependency)

### 3. Configuration
1. Create a `.env` file in the root directory with the following content:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pos_system
   PORT=3000
   ```
   Note: If you set a password for MySQL in XAMPP, update DB_PASSWORD accordingly.

### 4. Running the Application
1. Start the server:
   ```bash
   npm run dev
   ```
2. Open your web browser and navigate to:
   - Main Dashboard: http://localhost:3000/pages/home-dashboard.html
   - Inventory: http://localhost:3000/pages/inventory-dashboard.html
   - Sales: http://localhost:3000/pages/sales-dashboard.html

### Troubleshooting
- Make sure XAMPP's MySQL service is running
- Verify that the database credentials in `.env` match your XAMPP MySQL settings
- Check if the port 3000 is available (if not, change it in the .env file)
- If you get module not found errors, try running `npm install` again

## Features
- Product Inventory Management
- Sales Tracking
- Sales Reports
- Real-time Updates
