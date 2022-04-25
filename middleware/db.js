const mysql = require('mysql2/promise')
const config = require('../config/dbconfig')

let pool = mysql.createPool(config)

module.exports.getConnection = ()=>{
    return pool;
}


module.exports.executePreparedStatement = async (sql, params=[])=>{
    this.paramsCheck(params);
    try{
        const [rows, fields] = await pool.execute(
                sql, 
                params
            );
        return {
            rows,
            fields
        };
    } catch(err){
        //console.log(err);
        throw(err);
    }
}

module.exports.paramsCheck = (params = []) => {
    for (const x of params) {
        if (!x) {
            throw { msg: 'undefined elements' }
        }
    }
}