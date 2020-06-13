const config = require('./config')
const line = require('@line/bot-sdk');

MESSAGING_API_PREFIX = `https://api.line.me/v2/bot`;

const line_config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(line_config);


module.exports = {
    client: client,
    middleware() { return line.middleware(line_config); }
}
