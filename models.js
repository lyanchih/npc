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
        defaultValue: 0,
        validate: {
            min: 0,
        }
    },
    role: {
        type: Sequelize.ENUM('base', 'npc', 'gm'),
        defaultValue: 'base',
    },
}, {
    scopes: {
        items: {
            include: [{
                model: Item,
                // through: {
                //     where: {
                //         quantity: {
                //             [Op.gt]: 0
                //         }
                //     }
                // }
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
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
            min: 0
        }
    },
}, {
    modelName: 'userItems',
    sequelize: db,
});

User.belongsToMany(Item, {through: UserItems});
Item.belongsToMany(User, {through: UserItems});

const UserWithItems = User.scope('items');

class Store extends Model{};
Store.init({
    name: {
        type: Sequelize.STRING,
    },
    room_id: {
        type: Sequelize.STRING,
    }
}, {
    scopes: {
        global: {
            where: {
                name: "__global__",
            },
        },items: {
            include: [{
                model: Item
            }]
        },
    },
    sequelize: db,
    timestamps: false,
});

class StoreItems extends Model{};
StoreItems.init({
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }        
    },
    price: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        }
    }
}, {
    modelName: 'storeItems',
    sequelize: db,
});

StoreItems.belongsTo(Store);
StoreItems.belongsTo(Item);
Store.belongsToMany(Item, {through: StoreItems});
Item.belongsToMany(Store, {through: StoreItems});

module.exports = {
    sync: Promise.all([
        User.sync(),
        Item.sync(),
        UserItems.sync(),
        Store.sync(),
        StoreItems.sync(),
    ]),
    User: User,
    Item: Item,
    UserItems: UserItems,
    Store: Store,
    StoreItems: StoreItems,
    UserWithItems: UserWithItems,
};
