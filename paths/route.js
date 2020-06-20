const {cash_format, parse_items, parse_store_items} = require('./utils');
const {is_gm} = require('./role');
const {jco, co} = require('../utils')
const db = require('../db');
const {User, Item, UserItems, Store, StoreItems} = require('../models');
const {client} = require('../line');

module.exports = {
    register(event, name) {
        if (!!!name) {
            return;
        }
        
        const uid = event.source.userId;
        return new Promise((resolve, reject) => {
            User.scope({method: ['who', uid]}).findOne().then((u) => {
                if (!!u) {
                    return resolve(`已經註冊為 "${u.name}", 除非死亡、改名或換角.`);
                }
                
                client.getProfile(uid).then((p) => {
                    return p.displayName;
                }).then((dn) => {
                    User.create({
                        name: name,
                        line_id: uid,
                        cash: 0,
                    }).then((u) => {
                        resolve(`玩家 ${dn} 註冊 "${name}" 成功.`)
                    }).catch((err) => {
                        resolve(`玩家 ${dn} 註冊 "${name}" 失敗, 因為: ${err}.`)
                    });
                });
            });
        });
    },
    cash(event, name) {
        const uid = name || event.source.userId;
        return User.scope('items', {method: ['who', uid]}).findOne().then((u) => {
            if (!u) {
                return "尚未註冊";
            }
            
            return `${u.name} 擁有的的金幣: ${cash_format(u.cash)}`
        });
    },
    item(event, name) {
        const uid = name || event.source.userId;
        return User.scope('items', {method: ['who', uid]}).findOne().then((u) => {
            if (!u) {
                return "尚未註冊";
            }
            
            if (u.Items.length === 0) {
                return `${u.name}擁有的的金幣: ${cash_format(u.cash)}\n沒有道具`
            }
            return u.Items.filter((item) => item.userItems.quantity > 0).reduce((s, item) => s+=`${item.name}: ${item.userItems.quantity}\n`, `${u.name}擁有的的金幣: ${cash_format(u.cash)}\n道具欄:\n`);
        });;
    },
    give(event, uname, ...items) {
        const uid = event.source.userId;
        if (!is_gm(uid)) {
            return "只有GM可以輸入這個指令.";
        }

        const _items = parse_items(items);
        
        if (_items.cash === 0 && Object.keys(_items.items).length === 0) {
            return "請輸入要給的物品.";
        }
        
        return User.scope('items', {method: ['who', uname]}).findOne().then((u) => {
            if (!u) {
                return `"${uname}"尚未註冊`;
            }
            
            const owned_items = new Set(u.Items.map((i) => i.name));
            const give_items = new Set(Object.keys(_items.items));
            const exist_items = Array.from(owned_items.intersection(give_items));
            const new_items = Array.from(give_items.difference(owned_items));
            
            return db.transaction(t => {
                var p_arr = [];
                if (new_items.length !== 0) {
                    p_arr.push(
                        Item.findAll({where: {name: new_items}}, {transaction: t}).then((eis) => {
                            const eis_name = eis.map((ei) => ei.name);
                            return Item.bulkCreate(
                                new_items.
                                    filter((i) => eis_name.indexOf(i) === -1).
                                    map((ni) => { return {name: ni}; }),{transaction: t})
                                .then((nis) => UserItems.bulkCreate(eis.concat(nis).map((i) => {
                                    return {
                                        quantity: _items.items[i.name],
                                        UserId: u.id,
                                        ItemId: i.id,
                                    };
                                }), {transaction: t}));
                        }));
                }
                
                if (_items.cash !== 0) {
                    u.increment('cash', {by: _items.cash, transaction: t});
                }
                
                if (exist_items.length !== 0) {
                    const qty_obj = exist_items.reduce((obj, key) => {
                        const qty = _items.items[key];
                        if (!(qty in obj)) {
                            obj[qty] = [];
                        }
                        obj[qty].push(key);
                        return obj;
                    }, {})
                    
                    p_arr.push(Promise.all(Object.keys(qty_obj).map((qty) => {
                        return u.getItems({where: {name: qty_obj[qty]}}).
                            then((is) => {
                                return UserItems.increment('quantity', {
                                    by: +qty,
                                    transaction: t,
                                    where: {
                                        UserId: u.id,
                                        ItemId: is.map((i) => i.id),
                                    }
                                });
                            });
                    })));
                }
                
                return Promise.all(p_arr);
            }).then(() => `${u.name} 獲得道具成功`).catch((e) => co(e));
        });
    },
    trade(event, name, ...items) {
        const uid = event.source.userId;
        if (!name) {
            return "請輸入要交易的對象.";
        }
        
        const _items = parse_items(items);
        if (_items.cash === 0 && Object.keys(_items.items).length === 0) {
            return "請輸入要給的物品.";
        }
        
        return User.scope('items', {method: ['who', [uid, name]]}).findAll().then((us) => {
            const provider = us.find((u) => u.line_id === uid);
            if (!provider) {
                return `請先註冊`;
            }
            
            const receiver = us.find((u) => u.line_id === name || u.name === name);
            if (!receiver) {
                return `對方"${name}"尚未註冊`;
            }
            
            if (provider.cash < _items.cash) {
                return `金額不足 ${_items.cash - provider.cash}`;
            }
            
            const item_names = Object.keys(_items.items);
            return Item.findAll({where: {name: item_names}}).then((is) => {
                const no_exist_items = item_names.filter((i) => !is.find((j) => i === j.name));
                if (no_exist_items.length !== 0) {
                    return `下列道具不存在:\n${no_exist_items.join('\n')} `;
                }
                
                let not_enough_arr = [];
                is.forEach((i) => {
                    const found_item = provider.Items.find((j) => i.name === j.name);
                    if (!found_item) {
                        not_enough_arr.push(`${i.name}x${_items.items[i.name]}`);
                    } else if (found_item.userItems.quantity < _items.items[i.name]) {
                        not_enough_arr.push(`${i.name}x${_items.items[i.name]-found_item.userItems.quantity}`);
                    }
                    
                });
                if (not_enough_arr.length !== 0) {
                    return `下列道具不足:\n${not_enough_arr.join('\n')}`;
                }
                
                return db.transaction(t => {
                    let p_arr = [];

                    if (_items.cash !== 0) {
                        p_arr.concat([
                            provider.decrement('cash', {by: _items.cash, transaction: t}),
                            receiver.increment('cash', {by: _items.cash, transaction: t}),
                        ]);
                    }
                    
                    const p_qty_obj = item_names.reduce((obj, key) => {
                        const qty = _items.items[key];
                        if (!(qty in obj)) {
                            obj[qty] = [];
                        }
                        obj[qty].push(key);
                        return obj;
                    }, {})
                    
                    p_arr.push(Promise.all(Object.keys(p_qty_obj).map((qty) => {
                        return provider.getItems({where: {name: p_qty_obj[qty]}}).
                            then((is) => {
                                return UserItems.decrement('quantity', {
                                    by: +qty,
                                    transaction: t,
                                    where: {
                                        UserId: provider.id,
                                        ItemId: is.map((i) => i.id),
                                    }
                                });
                            });
                    })));
                    
                    // Bulk create reciver not owned items
                    const receiver_not_owned_items = is.filter((i) => !receiver.Items.find((j) => i.name === j.name));
                    const receiver_owned_items = is.filter((i) => !receiver_not_owned_items.find((j) => i.name === j.name));
                    if (receiver_not_owned_items.length !== 0) {
                        p_arr.push(UserItems.bulkCreate(receiver_not_owned_items.map((i) => { return {
                            UserId: receiver.id,
                            ItemId: i.id,
                            quantity: _items.items[i.name],
                        }; }, {transaction: t})));
                    }
                    
                    if (receiver_owned_items.length !== 0) {
                        const r_qty_obj = receiver_owned_items.reduce((obj, key) => {
                            const qty = _items.items[key.name];
                            if (!(qty in obj)) {
                                obj[qty] = [];
                            }
                            obj[qty].push(key.name);
                            return obj;
                        }, {})
                        
                        p_arr.push(Promise.all(Object.keys(r_qty_obj).map((qty) => {
                            return receiver.getItems({where: {name: r_qty_obj[qty]}}).
                                then((is) => {
                                    return UserItems.increment('quantity', {
                                        by: +qty,
                                        transaction: t,
                                        where: {
                                            UserId: receiver.id,
                                            ItemId: is.map((i) => i.id),
                                        }
                                    });
                                });
                        })));
                    }
                    
                    return Promise.all(p_arr);
                }).then(() => `${receiver.name} 交易道具成功`).catch((e) => co(e));
            });
        });
    },
    users(event) {
        if (!is_gm(event.source.userId)) {
            return "只有GM可以輸入這個指令.";
        }

        return User.findAll().then((us) => '玩家:'+us.map((u) => u.name).join(','));
    },
    store(event, ...items) {
        if (!is_gm(event.source.userId)) {
            return "只有GM可以輸入這個指令.";
        }

        return Store.scope('global', 'items').findOrCreate({where: {}, defaults: { name: "__global__"}}).then((ss) => {
            const s = ss[0];
            if (items.length === 0) {
                if (s.Items.every((item) => item.storeItems.quantity === 0)) {
                    return "商店目前沒有商品.";
                }
                return s.Items.filter((item) => item.storeItems.quantity > 0).reduce((s, item) => s+=`${item.name} x${item.storeItems.quantity} : \$ ${cash_format(item.storeItems.price)}\n`, `販賣的道具:\n`);
            }
            
            const _items = parse_store_items(items);
            const item_names = Object.keys(_items);
            return Item.findAll({where: {name: item_names}}).then((is) => {
                const not_exist_item = item_names.filter((name) => !is.find((i) => i.name === name));
                if (not_exist_item.length === 0) {
                    return is;
                }

                return Item.bulkCreate(not_exist_item.map((i) => ({ name: i }))).then((is2) => is.concat(is2));
            }).then((is) => db.transaction(t => {
                const not_owned_items = is.filter((i) => !s.Items.find((j) => i.name === j.name));
                const owned_items = is.filter((i) => s.Items.find((j) => i.name === j.name));
                let p_arr = [];
                
                if (not_owned_items.length !== 0) {
                    p_arr.push(StoreItems.bulkCreate(not_owned_items.map((i) => ({
                        StoreId: s.id,
                        ItemId: i.id,
                        quantity: _items[i.name].quantity,
                        price: _items[i.name].price,
                    })), {transaction: t}));
                }

                p_arr.concat(owned_items.map((i) => StoreItems.update(_items[i.name], {
                    where: {
                        StoreId: s.id,
                        ItemId: i.id,
                    }
                }, {transaction: t})));

                return Promise.all(p_arr);
            })).then(() => Store.scope('global', 'items').findOne()).
                then((s) => s.Items.filter((item) => item.storeItems.quantity > 0).reduce((s, item) => s+=`${item.name} x${item.storeItems.quantity} : \$ ${cash_format(item.storeItems.price)}\n`, `販賣的道具:\n`));
        });
    },
    buy(event, ...items) {
        const uid = event.source.userId;
        return Promise.all([
            User.scope('items', {method: ['who', uid]}).findOne(),
            Store.scope('global', 'items').findOne(),
        ]).then(res => {
            const u = res[0], s = res[1];
            if (!u) {
                return "尚未註冊";
            }
            if (!s) {
                return "商店尚未開張.";
            }

            const _items = parse_items(items);
            const item_names = Object.keys(_items.items);
            const not_sell_items = item_names.filter((i) => !s.Items.find((j) => i === j.name));
            if (not_sell_items.length !== 0) {
                return ["沒有販賣下列商品:"].concat(not_sell_items).join('\n');
            }

            const mapped_items = item_names.map((i) => s.Items.find((j) => i === j.name));
            const not_enough_items = mapped_items.filter((i) => i.storeItems.quantity < _items.items[i.name]);
            if (not_enough_items.length !== 0) {
                return ["下列商品數量不足夠:"].concat(not_enough_items.map((i) => `${i.name}x${_items.items[i.name] - i.storeItems.quantity}`)).join('\n');
            }

            const total = mapped_items.reduce((acc, i) => acc + _items.items[i.name] * i.storeItems.price, 0);
            if (u.cash < total) {
                return `玩家金幣不夠: ${cash_format(total - u.cash)}`;
            }

            return db.transaction(t => {
                let p_arr = [u.decrement('cash', {by: total, transaction: t})];

                const user_not_owned_items = mapped_items.filter((i) => !u.Items.find((j) => i.name === j.name));
                const user_owned_items = mapped_items.filter((i) => u.Items.find((j) => i.name === j.name));
                if (user_not_owned_items.length !== 0) {
                    p_arr.push(UserItems.bulkCreate(user_not_owned_items.map((i) => ({
                        UserId: u.id,
                        ItemId: i.id,
                        quantity: +_items.items[i.name],
                    })), {transaction: t}));
                }

                if (user_owned_items.length !== 0) {
                    const qty_obj = user_owned_items.reduce((obj, i) => {
                        const qty = _items.items[i.name];
                        if (!(qty in obj)) {
                            obj[qty] = [];
                        }
                        obj[qty].push(i.name);
                        return obj;
                    }, {})
                    p_arr.push(Promise.all(Object.keys(qty_obj).
                                           map((qty) =>
                                               u.getItems({where: {name: qty_obj[qty]}}).
                                               then((is) =>
                                                    UserItems.increment('quantity', {
                                                        by: +qty,
                                                        transaction: t,
                                                        where: {
                                                            UserId: u.id,
                                                            ItemId: is.map((i) => i.id),
                                                        }})))));
                    p_arr.push(Promise.all(Object.keys(qty_obj).
                                           map((qty) =>
                                               s.getItems({where: {name: qty_obj[qty]}}).
                                               then((is) =>
                                                    StoreItems.decrement('quantity', {
                                                        by: +qty,
                                                        transaction: t,
                                                        where: {
                                                            StoreId: s.id,
                                                            ItemId: is.map((i) => i.id),
                                                        }})))));
                }
                return Promise.all(p_arr);
            }).then(() => `購買成功, 尚餘 ${cash_format(u.cash - total)}.` );
        });
    },
};
