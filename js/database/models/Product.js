import pkg from 'sequelize';
const { DataTypes } = pkg;
import sequelize from '../config.js';

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    variant: {
        type: DataTypes.STRING,
        allowNull: true
    },
    costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['name', 'variant']
        }
    ]
});

export default Product;