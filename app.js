const config = require('./config')
const fs = require('fs');
const express = require('express');
const https = require('https');
const {jco, co} = require('./utils')
const {client, middleware} = require('./line');
const path = require('path');
const route = require('./paths/route');


const app = express();

app.use('/static', express.static(path.join(__dirname, 'static')));

var server = https.createServer({
    key: fs.readFileSync(config.certs.key),
    cert: fs.readFileSync(config.certs.cert),
    ca: [ fs.readFileSync(config.certs.ca) ]
}, app);

app.post('/callback', middleware(), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text' ||
        !event.message.text.startsWith('/')) {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    
    const cmds = event.message.text.split(' ').filter((t) => !!t);
    const path = cmds[0].substr(1);
    
    if (!!!route[path]) {
        console.log(`Path ${path} is not support`);
        return Promise.resolve(null);
    }
    
    const res = route[path].apply(this, [event].concat(cmds.slice(1)));
    if (!!!res) {
        return Promise.resolve(null);
    } else if (typeof res === 'string') {
        return client.replyMessage(event.replyToken, {type: 'text', text: res});
    }
    
    return res.then((echo) => {
        if (typeof echo === 'string') {
            client.replyMessage(event.replyToken, {type: 'text', text: echo});
        } else {
            client.replyMessage(event.replyToken, echo);
        }
    });
}

module.exports = {
    run() { 
        server.listen(config.port, function() {
            console.log('runing Web Server in ' + config.port + ' port...');
        });
    }
    
};
