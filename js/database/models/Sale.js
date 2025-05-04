import pkg from 'sequelize';
const { DataTypes } = pkg;
import sequelize from '../config.js';

const Sale = sequelize.define('Sale', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    refunded: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    refundDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['date']
        }
    ]
});

export default Sale;