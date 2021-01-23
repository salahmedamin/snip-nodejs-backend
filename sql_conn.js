const sql = require("mysql")
const conn = sql.createConnection({
    host: "localhost",
    user: "root",
    password: "mysql",
    database: "infoplus"
});
module.exports = conn