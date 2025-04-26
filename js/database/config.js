import { Sequelize } from '/node_modules/sequelize/lib/sequelize.js';
import dotenv from '/node_modules/dotenv/lib/main.js';
import mysql from '/node_modules/mysql2/promise.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function createDatabaseIfNotExists() {
    try {
        // Create a temporary connection without specifying a database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 3306
        });

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'pos_system'}`);
        console.log('Database created or already exists');
        await connection.end();
        return true;
    } catch (error) {
        console.error('Error creating database:', error);
        return false;
    }
}

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME || 'pos_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
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

export async function testConnection() {
    try {
        // Test MySQL server connection first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 3306
        });
        await connection.end();
        
        // If server is running, try to connect to the database
        await sequelize.authenticate();
        return { serverRunning: true, databaseConnected: true };
    } catch (error) {
        if (error.code === 'ER_BAD_DB_ERROR') {
            return { serverRunning: true, databaseConnected: false };
        }
        return { serverRunning: false, databaseConnected: false };
    }
}

export async function initializeDatabase() {
    try {
        const status = await testConnection();
        
        if (!status.serverRunning) {
            throw new Error('MySQL server is not running');
        }

        if (!status.databaseConnected) {
            console.log('Database not found, creating...');
            const created = await createDatabaseIfNotExists();
            if (!created) {
                throw new Error('Failed to create database');
            }
        }

        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('Database synchronized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

export default sequelize;