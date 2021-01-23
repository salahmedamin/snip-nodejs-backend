const Axios = require("axios");
const sha256 = require('js-sha256')
const MSG = require("./Messaging")
const {Base64} = require("js-base64")
class User extends MSG{
    constructor(SQL_CONNECTION){
        super()
        this.conn = SQL_CONNECTION
    }
    
    rand = ()=>Math.random(0).toString(36).substr(2);
    token = (length)=>(this.rand()+this.rand()+this.rand()+this.rand()).substr(0,length);
    validateEmail = (email)=>{
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    sha256 = (pw)=>{
        return sha256.sha256(pw)
    }

    signUp=async(fName,lName,email,pw,username)=>{
        return new Promise(async(resolve,reject)=>{
            let fToken = this.token(50),vToken = this.token(50),hashed = this.sha256(pw)
            if(!this.validateEmail(email)) return resolve({success:false,message:"This email format isn't correct"})
            if(await this.checkUserExists(username,true,email)) return resolve({success:false,message:"Found records of email/username already stored"})

            this.conn.query("INSERT INTO users(fName,lName,email,password,username,verif_token,forgot_token) VALUES(?,?,?,?,?,?,?)",[fName,lName,email,hashed,username,vToken,fToken],(err,res)=>{
                if(err) console.log(err)
                if(res.insertId !== undefined) return resolve({success:true})
                else return resolve({success:false,message:"Internal error"})
            })
        })
    }

    isActivated = async(email)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) AS c FROM users WHERE email = ? AND verified=1",[email],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c>0)
            })
        })
    }

    firstTime = async(email)=>{
        return new Promise((resolve,reject)=>{
            this.conn.query("SELECT COUNT(*) AS c FROM loginuas WHERE email=?",[email],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c==0)
            })
        })
    }

    countryLogExists = async (email,country)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) AS c FROM logincountries WHERE email = ? AND country = ?",[email,country],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c>0)
            })
        })
    }

    UAExists = async(email,ua)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) AS c FROM loginuas WHERE email = ? AND ua = ?",[email,ua],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c>0)
            })
        })
    }

    addCnUA = async(email,table/*table is to be a country, or an UA*/,col_name,value)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query(`INSERT INTO login${table}(${col_name},email) VALUE(?,?)`,[value,email],(err,res)=>{
                if(err) console.log(err)
                return resolve(true)
            })
        })
    }

    setOnline = async(email)=>{
        return new Promise((r,rej)=>{
            let date = this.getTime()
            this.conn.query("UPDATE users SET last_online = ? WHERE email = ?",[date,email],(err,res)=>{
                return r(true)
            })
        })
    }

    foundSigninRecords = async(email,pw)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) AS c,id,username,email,fName,lName,picture FROM users WHERE email = ? AND password = ?",[email,this.sha256(pw)],(err,res)=>{
                if(err) rej(err)
                if(res[0].c==0){
                    return resolve(false)
                }
                const {id,username,email,fName,lName,picture} = res[0]
                return resolve({id,username,email,fName,lName,picture})
            })
        })
    }


    isLocked = async(email)=>{
        return new Promise((resolve,reject)=>{
            this.conn.query("SELECT COUNT(*) AS c FROM users WHERE email = ? AND locked = 1",[email],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c==1)
            })
        })
    }
    lockSwitch = async(email,lockVal)=>{
        return new Promise((resolve,reject)=>{
            this.conn.query("UPDATE users SET locked = ? WHERE email = ?",[lockVal,email],(err,res)=>{
                if(err) console.log(err)
                return resolve(true)
            })
        })
    }
    goodIP= async(ip)=>{
        if(ip == "127.0.0.1" || ip == "::1") return "Tunisia";
        Axios.get("https://v2.api.iphub.info/guest/ip/"+ip).then(v=>{
            return v.data.block == 1 ? false : v.data.countryName
        })
    }
    signin = async(email,pw,request)=>{
        return new Promise(async(resolve,rej)=>{
            let response = {success:false}
            let ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress
            let ua = request.headers['user-agent']
            let NoVPN = await this.goodIP(ip)
            if(!NoVPN) return resolve({...response,message:"No VPNs are allowed"})
            let userRecords = await this.foundSigninRecords(email,pw)
            if(userRecords){
                let isActive = await this.isActivated(email),isLocked = await this.isLocked(email)
                if(isActive && !isLocked){
                    if(await this.firstTime(email)){
                        await this.addCnUA(email,"uas","UA",Base64.btoa(ua))
                        await this.addCnUA(email,"countries","country",NoVPN)
                        response.success = true
                        response = {...response,userRecords}
                        return resolve(response)
                    }
                    else{
                        // let UAExists = await this.UAExists(email,Base64.btoa(ua)),countryLogEx = await this.countryLogExists(email,NoVPN)
                        // if(UAExists && countryLogEx){
                            //All good here
                            //IMPLEMENT JWT
                            response.success = true
                            response = {...response,userRecords}
                            return resolve(response)
                        // }
                        // else{
                        //     await this.lockSwitch(email,1)
                        //     let token = this.token(50)
                        //     // Finally mail it to the email => example: Mail(email,token,UA)

                        //     response.message = "Account temporairly blocked, check your email to unlock"
                        //     return resolve(response)
                        // }
                    }
                }
                else{
                    response.message = "Your account is either locked, or not yet verified."
                    return resolve(response)
                }
            }
            else{
                response.message = "No such email and password combination exists"
                return resolve(response)
            }
        })
    }

    resetPassRequest = async(detail,checkEx)=>{
        if(checkEx(detail,true,detail)){
            return new Promise((resolve,reject)=>{
                this.conn.query("SELECT forgot_token as fT,email,last_sent_reset_email as lsre FROM users WHERE username = ? OR email = ?",[detail,detail],(err,res)=>{
                    if(err) console.log(err)
                    let email = res[0].email,fToken = res[0].fT,lsre=res[0].lsre
                    if(lsre == null || this.getTime() - lsre >= 300){
                        //Mail(email,fT)
                        return resolve(true)
                    }
                })
            })
        }
    }

    matchToken = async(email,tokenType,token)=>{
        return new Promise((resolve,reject)=>{
            if(tokenType == "forgot"){
                
            }
            else if(tokenType == "verify"){
    
            }
        })
    }

    changePassword = (email,token,newPass)=>{

    }

    verifyAccount = (email,token)=>{

    }

}

module.exports = User