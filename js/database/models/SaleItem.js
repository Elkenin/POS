import { DataTypes } from '/node_modules/sequelize/lib/sequelize.js';
import sequelize from '../config.js';

const SaleItem = sequelize.define('SaleItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    saleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Sales',
            key: 'id'
        }
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Products',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price at time of sale'
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['saleId']
        },
        {
            fields: ['productId']
        }
    ]
});

export default SaleItem;