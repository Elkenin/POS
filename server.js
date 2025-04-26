import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './js/database/index.js';
import { testConnection } from './js/database/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const status = await testConnection();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: {
                serverRunning: status.serverRunning,
                databaseConnected: status.databaseConnected
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.getProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const product = await db.createProduct(req.body);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await db.updateProduct(req.params.id, req.body);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const success = await db.deleteProduct(req.params.id);
        if (success) {
            res.json({ message: 'Product deleted successfully' });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sales API
app.get('/api/sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const sales = await db.getSales(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const sale = await db.createSale(req.body, req.body.items);
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales/:id/refund', async (req, res) => {
    try {
        const success = await db.refundSale(req.params.id);
        if (success) {
            res.json({ message: 'Sale refunded successfully' });
        } else {
            res.status(404).json({ error: 'Sale not found or already refunded' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistics API
app.get('/api/stats/daily/:date', async (req, res) => {
    try {
        const stats = await db.getDailyStats(new Date(req.params.date));
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats/monthly/:year/:month', async (req, res) => {
    try {
        const stats = await db.getMonthlyStats(
            parseInt(req.params.year),
            parseInt(req.params.month)
        );
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Main route
app.get('/', (req, res) => {
    res.redirect('/pages/dashboard.html');
});

// Handle 404
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        const dbInitialized = await db.initialize();
        if (!dbInitialized) {
            console.error('Failed to initialize database. Server will start but may not function correctly.');
        } else {
            console.log('Database initialized successfully');
        }

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Access the application at http://localhost:${PORT}`);
            console.log(`Check server health at http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Server initialization error:', error);
        process.exit(1);
    }
}

startServer();