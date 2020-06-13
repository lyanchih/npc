module.exports = {
    env: 'test',
    database: {
        db: 'npc',
        host: '127.0.0.1',
        port: 13306,
        user: 'root',
        password: 'test'
    },
    port: 8000,
    certs: {
        key: 'certs/private.key',
        cert: 'certs/cert.crt',
        ca: 'certs/ca_bundle.crt',
    }
}
