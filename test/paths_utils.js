var assert = require('assert');

const utils = require('../paths/utils.js');

test_data_to_obj = (data) => {
    let obj = {}
    for (i = 0; i < data.length; i+=3) {
        obj[data[i]] = { quantity: data[i+1], price: data[i+2]};
    }
    return obj;
}

describe('utils', function () {
    describe('#parse_store_items()', function () {
        it('should return empty without arguments', function () {
            assert.deepEqual(utils.parse_store_items(), {});
        });
        it('should return empty with empty array', function () {
            assert.deepEqual(utils.parse_store_items([]), {});
        });
        it('should only one item', function () {
            assert.deepEqual(utils.parse_store_items(["xo"]),
                             test_data_to_obj(['xo', 1, 1]));
        });
        it('should only one item with price', function () {
            assert.deepEqual(utils.parse_store_items(["xo", "123"]),
                             test_data_to_obj(['xo', 1, 123]));
        });
        it('should only one item with quantity', function () {
            assert.deepEqual(utils.parse_store_items(["xox55"]),
                             test_data_to_obj(['xo', 55, 1]));
        });
        it('should only one item with quantity, price', function () {
            assert.deepEqual(utils.parse_store_items(["xox5566", "123"]),
                             test_data_to_obj(['xo', 5566, 123]));
        });
        it('should multiple items', function () {
            assert.deepEqual(utils.parse_store_items(["foo", "bar"]),
                             test_data_to_obj(['foo', 1, 1, 'bar', 1, 1]));
        });
        it('should multiple items with price', function () {
            assert.deepEqual(utils.parse_store_items(["foo", '5566', "bar", "zaa"]),
                             test_data_to_obj(['foo', 1, 5566, 'bar', 1, 1, "zaa", 1, 1]));
        });
        it('should multiple items with quantity', function () {
            assert.deepEqual(utils.parse_store_items(["foox55", "bar", "zaax13"]),
                             test_data_to_obj(['foo', 55, 1, 'bar', 1, 1, "zaa", 13, 1]));
        });
        it('should multiple items with quantity and price', function () {
            assert.deepEqual(utils.parse_store_items(["foox55", 551, "bar", 151, "zaax13"]),
                             test_data_to_obj(['foo', 55, 551, 'bar', 1, 151, "zaa", 13, 1]));
        });
    });
});
