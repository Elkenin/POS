import Sequelize from 'sequelize';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    port: parseInt(process.env.DB_PORT) || 3306
};

// Create Sequelize instance
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.user,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'mysql',
        logging: false,
        timezone: '+00:00',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Initialize database
export async function initializeDatabase() {
    try {
        // Test connection
        await testConnection();
        
        // Create database if it doesn't exist
        await createDatabaseIfNotExists();
        
        // Sync models
        await sequelize.sync();
        
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

// Create database if it doesn't exist
async function createDatabaseIfNotExists() {
    const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port
    });

    try {
        await tempConnection.query(
            `CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`
        );
        console.log('Database created or already exists');
        return true;
    } catch (error) {
        console.error('Error creating database:', error);
        return false;
    } finally {
        await tempConnection.end();
    }
}

// Test database connection
export async function testConnection() {
    try {
        await sequelize.authenticate();
        return { connected: true, error: null };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

export default sequelize;