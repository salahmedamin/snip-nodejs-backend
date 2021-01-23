const UserClass = require("../modules/User")
const sql = require("../sql_conn")
const User = new UserClass(sql)
const tokenVerif = require("../middleware/tokenVerif")
module.exports ={
    type: (value,type)=>typeof value == "object" ? value.constructor.name == type.charAt(0).toUpperCase()+type.slice(1) : typeof value == type,
    required:(val)=>val.length > 0,
    minLength: (val,min)=>val.length >= min,
    maxLength:(val,max)=>val.length <= max,
    userExists: async(username)=>await User.checkUserExists(username),
    messageExists:async(id)=>await User.checkMessageExists(id),
    isEmail:(val)=>/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(val),
    availableEmail: async(e)=> await User.checkUserExists(e,true,e),
    pastTime:(time)=>Math.floor(Date.now()/1000) - time >= 0,
    validEmoji:(code)=>/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(code),
    validToken: async(token)=>(await tokenVerif(token))
}