require("dotenv").config()
const jwt = require("jsonwebtoken")
const UserClass = require("../modules/User")
const SQL_CONN = require("../sql_conn")
const User = new UserClass(SQL_CONN)
module.exports = async(token)=>{
    const tokStr = token
    try{
        if(!tokStr || tokStr == undefined) throw new Error()
        const jwtRSP = (jwt.verify(tokStr,process.env.JWT_SECRET))
        const exists = await User.checkUserExists(jwtRSP.username)
        if(!exists) throw new Error()
        return JSON.stringify({good:true,records:jwtRSP})
    }
    catch(err){
        console.log(err.message)
        return(JSON.stringify({good:false}))
    }
}