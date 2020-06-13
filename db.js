const Sequelize = require('sequelize');

const conf = require('./config');
db_conf = conf.database;

const sequelize = ((env) => {
    if (env === 'test') {
        return new Sequelize({
            dialect: 'sqlite',
            storage: 'dbs/'+env+'.sqlite'
        });
    } else {
        return new Sequelize(db_conf.db, db_conf.user, db_conf.password,
                                        {
                                            dialect: 'mysql',
                                            database: db_conf.db,
                                            host: db_conf.host,
                                            port: db_conf.port
                                        });
    }
})(conf.env);

module.exports = sequelize;
