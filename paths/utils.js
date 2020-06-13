const MULTIPLE_ITEM_RE=/[xX](\d+)$/
const MONEY_RE=/^(\d+)([csgCSG])?$/
const MONEY_TIMES = {
    'c' : 1,
    's' : 1000,
    'g' : 1000000,
    'C' : 1,
    'S' : 1000,
    'G' : 1000000,
}

module.exports = {
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
}
