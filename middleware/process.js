const data = require("../data_struct/data");
const ax = require("axios")
require("dotenv").config()
const discrete = (message,res,status=406)=>{
    res.status(status)
    res.end()
}
const verifiedRecaptcha = async(response,ip)=>{
    let googleURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.RECAPTCHA_SECRET_KEY + "&response=" + response + "&remoteip=" + ip;
    let v = await ax.default.get(googleURL)
    return v.data.success
}
const verifyParams = async(req,res,next)=>{
    let path = req.originalUrl.slice(1).split("/")
    if(!data[path[0]]){
        discrete("Unknown endpoint",res,404)
    }
    if(!req.body || Object.keys(req.body).length == 0){
        discrete("No POST data request detected",res,204)
    }

    
    // access $data.path object and iterate through its key by dataPathParam
    // if $data.path.attribute (such as email,password,...) == dataPathParam
    // then check required,type which are $data.path.attribute->required and ->type
    //apply required and type check
    //then apply all remaining functions in $data.path.attribute.fn
    let adds = data.additional
    
    // Google RECAPTCHA Server Side Verification
    if(data[path[0]].recaptched){
        console.log("ola")
        let ip = req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        let ez = await verifiedRecaptcha(req.body.recapResponse,ip)
        if(!ez){
            discrete("Google Recaptcha Verification Failed",res)
        }
    }

    if(data[path[0]].token){
        if(!adds.validToken(data[path[0]].token)){
            discrete("Invalid Token Provided",res,401)
        }
    }

    for(let dataPathParam in data[path[0]]){
        for(let bodyParam in req.body){
            const curDataVal = data[path[0]][dataPathParam] // sample: {required:true,...} from email in data
            
            if(dataPathParam == "token") continue
            if(bodyParam !== dataPathParam) continue

            const curBodyVal = req.body[bodyParam] //sample: value in POST request of key "bodyParam"
            
            const { required,type,minLength,maxLength,fn } = curDataVal


            if(required) if(!adds.required(curBodyVal)){
                discrete(bodyParam+" is required",res)
            }
            if(!adds.type(curBodyVal,type)){
                discrete(bodyParam+" type is supposed to be "+type,res)
            }
            if(minLength) if(!adds.minLength(curBodyVal,minLength)){
                discrete("Value length doesn't match minimum length for "+bodyParam,res)
            }
            if(maxLength) if(!adds.maxLength(curBodyVal,maxLength)){
                discrete("Value length doesn't match maximum length for "+bodyParam,res)
            }
            //time to execute all others fncs
            if(!fn) continue
            if(!fn.every(async v=>await v(curBodyVal))){
                discrete("Verification through "+fn[i].name+" failed",res)
            }
            continue
        }
    }
    next()
}
module.exports=verifyParams;