import { Op } from '/node_modules/sequelize/lib/sequelize.js';
import { initializeDatabase } from './config.js';
import Product from './models/Product.js';
import Sale from './models/Sale.js';
import SaleItem from './models/SaleItem.js';

// Initialize models relationships
Product.hasMany(SaleItem);
SaleItem.belongsTo(Product);

Sale.hasMany(SaleItem);
SaleItem.belongsTo(Sale);

// Initialize database and models
export async function initialize() {
    return await initializeDatabase();
}

// Product operations
export async function getProducts() {
    return await Product.findAll();
}

export async function createProduct(productData) {
    return await Product.create(productData);
}

export async function updateProduct(id, productData) {
    const product = await Product.findByPk(id);
    if (product) {
        return await product.update(productData);
    }
    return null;
}

export async function deleteProduct(id) {
    const product = await Product.findByPk(id);
    if (product) {
        await product.destroy();
        return true;
    }
    return false;
}

// Sale operations
export async function createSale(saleData, items) {
    const sale = await Sale.create(saleData);
    
    // Process each item and update inventory
    for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product || product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for product ${product?.name || 'Unknown'}`);
        }
        
        await product.update({ quantity: product.quantity - item.quantity });
        await SaleItem.create({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price
        });
    }
    
    return sale;
}

export async function getSales(startDate, endDate) {
    const where = {};
    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.$gte = startDate;
        if (endDate) where.date.$lte = endDate;
    }
    
    return await Sale.findAll({
        where,
        include: [{
            model: SaleItem,
            include: [Product]
        }]
    });
}

export async function refundSale(saleId) {
    const sale = await Sale.findByPk(saleId, {
        include: [{
            model: SaleItem,
            include: [Product]
        }]
    });
    
    if (!sale || sale.refunded) {
        return false;
    }
    
    // Restore inventory quantities
    for (const item of sale.SaleItems) {
        await item.Product.update({
            quantity: item.Product.quantity + item.quantity
        });
    }
    
    await sale.update({ refunded: true });
    return true;
}

// Statistics operations
export async function getDailyStats(date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const sales = await Sale.findAll({
        where: {
            date: {
                $between: [startDate, endDate]
            },
            refunded: false
        },
        include: [SaleItem]
    });
    
    return {
        totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
        itemCount: sales.reduce((sum, sale) => 
            sum + sale.SaleItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
        revenue: sales.reduce((sum, sale) => 
            sum + sale.SaleItems.reduce((itemSum, item) => 
                itemSum + (item.price - item.Product.costPrice) * item.quantity, 0), 0)
    };
}

export async function getMonthlyStats(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    const sales = await Sale.findAll({
        where: {
            date: {
                $between: [startDate, endDate]
            },
            refunded: false
        },
        include: [{
            model: SaleItem,
            include: [Product]
        }]
    });
    
    return {
        totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
        revenue: sales.reduce((sum, sale) => 
            sum + sale.SaleItems.reduce((itemSum, item) => 
                itemSum + (item.price - item.Product.costPrice) * item.quantity, 0), 0)
    };
}

// Export models and operations
export { Product, Sale, SaleItem };