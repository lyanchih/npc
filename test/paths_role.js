var assert = require('assert');

const role = require('../paths/role.js');

describe('role', function () {
    describe('#is_gm()', function () {
        it('should be gm', function () {
            assert.ok(role.is_gm('GM'));
            assert.ok(role.is_gm('Ud2c5795896661cb1d18de9c2f376f840'));
            assert.ok(role.is_gm('Ud4950152166cf7eee09f8a2ade171cc0'));
        });
        it('should not be gm', function () {
            assert.equal(role.is_gm('gm'), false);
            assert.equal(role.is_gm('test'), false);
            assert.equal(role.is_gm('ud4950152166cf7eee09f8a2ade171cc0'), false);
        });
    });
});
