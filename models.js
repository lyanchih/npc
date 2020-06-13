const {Sequelize, Model} = require('sequelize');
const Op = Sequelize.Op;
const db = require('./db');

class Item extends Model{};
Item.init({
    name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
    },
    description: {
        type: Sequelize.TEXT,
    }
}, {
    sequelize: db,
    timestamps: false,
});

class User extends Model {};
User.init({
    name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
    },
    line_id: {
        type: Sequelize.STRING,
    },
    cash: {
        type: Sequelize.INTEGER,
        min: 0,
    },
}, {
    scopes: {
        items: {
            include: [{
                model: Item,
                through: {
                    where: {
                        quantity: {
                            [Op.gt]: 0
                        }
                    }
                }
            }]
        },
        who(val) {
            return {
                where: {
                    [Op.or]: [
                        {
                            line_id: val
                        },
                        {
                            name: val
                        }]
                }
            };
        },
    },
    sequelize: db,
    timestamps: false,
});

class UserItems extends Model{};
UserItems.init({
    seller_id: {
        type: Sequelize.INTEGER,
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
}, {
    modelName: 'userItems',
    sequelize: db,
});

User.belongsToMany(Item, {through: UserItems});
Item.belongsToMany(User, {through: UserItems});

const UserWithItems = User.scope('items');

module.exports = {
    sync: Promise.all([
        User.sync(),
        Item.sync(),
        UserItems.sync(),
    ]),
    User: User,
    Item: Item,
    UserItems: UserItems,
    UserWithItems: UserWithItems,
};
