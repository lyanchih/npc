const MULTIPLE_ITEM_RE=/[xX](\d+)$/
const MONEY_RE=/^(\d+)([csgCSG])?$/
const MONEY_TIMES = {
    'c' : 1,
    's' : 10,
    'g' : 100,
    'C' : 1,
    'S' : 10,
    'G' : 100,
};

module.exports = {
    cash_format(cash) {
        const c = cash % 10;
        const s = Math.floor(cash / 10) % 10;
        const g = Math.floor(cash / 100);
        let arr = [];
        if (g !== 0) { arr.push(`${g}金`)}
        if (s !== 0) { arr.push(`${s}銀`)}
        if (c !== 0) { arr.push(`${c}銅`)}

        return arr.join(' ');
    },
    parse_items(items) {
        if (typeof items === 'string') {
            items = [items];
        }
        let result = {
            cash: 0,
            items: {
            },
        };
        
        for (key in items) {
            let item = items[key], qty = 1;
            if (MONEY_RE.test(item)) {
                let r = MONEY_RE.exec(item);
                result.cash += +r[1] * MONEY_TIMES[r[2] || 'c'];
                continue;
            } else if (MULTIPLE_ITEM_RE.test(item)) {
                let r = MULTIPLE_ITEM_RE.exec(item);
                if (r.index === 0) {
                    continue;
                }
                item = r.input.slice(0, r.index);
                qty = r[1];
            }
            
            result.items[item] = item in result ? qty + result.items[item] : qty;
        }
        return result;
    },
    parse_store_items(items) {
        if (!items) {
            return {};
        }

        var item_name = null;
        var qty = 1;
        var price = 1;
        let result = {};
        items.forEach((name) => {
            if (!item_name) {
                if (MONEY_RE.test(name)) {
                    return;
                }

                item_name = name;
                qty = 1;
                price = 1;
                if (MULTIPLE_ITEM_RE.test(name)) {
                    let r = MULTIPLE_ITEM_RE.exec(name);
                    if (r.index === 0) {
                        return;
                    }
                    item_name = r.input.slice(0, r.index);
                    qty = +r[1];
                }
            } else {
                if (MONEY_RE.test(name)) {
                    price = +name;
                    result[item_name] = { quantity: qty, price: price };
                    item_name = null;
                    price = 1;
                } else {
                    result[item_name] = { quantity: qty, price: price };

                    price = 1;
                    if (MULTIPLE_ITEM_RE.test(name)) {
                        let r = MULTIPLE_ITEM_RE.exec(name);
                        if (r.index === 0) {
                            return;
                        }
                        item_name = r.input.slice(0, r.index);
                        qty = +r[1];
                    } else {
                        item_name = name;
                        qty = 1;
                    }
                }
            }
        });
        if (item_name) {
            result[item_name] = { quantity: qty, price: price };
        }

        return result;
    }
}
