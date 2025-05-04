import { DataTypes } from 'sequelize';
import sequelize from '../config.js';

const SaleItem = sequelize.define('SaleItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    saleId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    total: {
        type: DataTypes.VIRTUAL,
        get() {
            return parseFloat(this.price * this.quantity).toFixed(2);
        }
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['saleId'] },
        { fields: ['productId'] }
    ]
});

export default SaleItem;