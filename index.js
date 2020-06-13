const db = require('./db');
const models = require('./models');
const app = require('./app');

db.authenticate().then(() => {
    console.log('Connection has been established successfully.');
    models.sync.then(app.run);
    return;
}).catch(err => {
    console.log('Unable to connect to the database:', err);
});
