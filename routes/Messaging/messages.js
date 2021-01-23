const User = require("../../modules/User")
const SQL_CONNECTION = require("../../sql_conn")

const express = require("express")
const router = express.Router()


const SNIP_USER = new User(SQL_CONNECTION)



router
    .route("/loadChats")
    .post(async(req,res)=>{
        res.send(await SNIP_USER.loadMessages(req.body.user,req.body.index))
    })

router
    .route("/paginate")
    .post(async(req,res)=>{
            if(await SNIP_USER.checkUserExists(req.body.username) && await SNIP_USER.checkUserExists(req.body.other) && !req.body.isGroup)
                res.send(await SNIP_USER.paginateMessages(req.body.username,req.body.other,req.body.index))
            else if(req.body.isGroup)
                res.send(await SNIP_USER.paginateMessages(req.body.username,req.body.other,req.body.index,true))
            else
                res.send({error:true,reason:"One at least of specified users doesn't exist"})
    })

router
    .route("/updateDetails")
    .post(async(req,res)=>{
        res.send(await SNIP_USER.updateDetails(req.body.user,req.body.index))
    })

router
    .route("/readFullConvo")
    .post(async(req,res)=>{
        const {user,other,isGroup} = req.body
        res.send(await SNIP_USER.readFullConvo(user,other,isGroup))
    })

router
    .route("/searchChats")
    .post(async(req,res)=>{
        res.send(await SNIP_USER.searchChats(req.body.user,req.body.keyword))
    })

router
    .route("/searchNewReceivers")
    .post(async(req,res)=>{
        let x = await SNIP_USER.searchNewReceivers(req.body.user,req.body.keyword)
        console.log(x)
        res.send(x)
    })

router
    .route("/reactOnMessage")
    .post(async(req,res)=>{
        res.send(await SNIP_USER.reactProcess(req.body.user,req.body.messageid,req.body.type))
    })

router
    .route("/deleteForMe")
    .post(async()=>{
        res.send(await SNIP_USER.deleteMessageForMe(req.body.user,req.body.id))
    })

router
    .route("/blocking")
    .post(async(req,res)=>{
        let types = ["block","unblock"]
        if(!types.includes(req.body.tp)){
            res.send({error:"Wrong parameter(s)"})
        }
        else{
            res.send(await SNIP_USER.blockProcess(req.body.tp,req.body.us,req.body.other))
        }
    })

// router
//     .route("/sendMessage")
//     .get(async(req,res)=>{
//         if(req.body.receivers == undefined || req.body.receivers.length == 0){
//             res.end(JSON.stringify({error:"Unspecified receiver(s)"}))
//             return
//         }
//         let all = req.body.receivers.split(",")
//         let lemm = [],shouldSend=false,index
//         for(index=0;index<all.length;index++){
//             let c = all[index]
//             let exists = await SNIP_USER.checkUserExists(c)
//             shouldSend = (index==all.length-1)
//             if(!exists) continue
//             let z = await SNIP_USER.sendMsg(req.body.user,c,UA,req.body.message)
//             lemm.push(z)
//         }
//         res.end(JSON.stringify(lemm))
//     })

router
    .route("/sendSingleMessage")
    .post(async(req,res)=>{
        const {sender,receiver,content,replyToID,isGroup,isHint} = req.body
        let newMessage = await SNIP_USER.sendMsg(sender,isGroup ? "" : receiver,req.headers['user-agent'],content,isGroup ? parseInt(receiver) : -1,replyToID == null ? -1 : replyToID,isHint ? 1 : 0)
        // io.emit("Message_Sent",(newMessage))
        if(replyToID !== null){
            const repliedTo = await SNIP_USER.getMessage(replyToID),
            {sender,sent_at,content} = repliedTo
            newMessage = {...newMessage,replyDetails:{
                sender,
                sent_at,
                content: SNIP_USER.getHumanTiming(content)
            }}
        }
        req.app.io.emit("SingleMessageSent",newMessage)
        res.send(newMessage)
    })

router
    .route("/deleteFullConvo")
    .post(async(req,res)=>{
        let user = req.body.user,other=req.body.other,last=req.body.lastid
        ,rez = {
            done: await SNIP_USER.deleteConvo(user,other,last)
        }
        res.end(JSON.stringify(rez))
    })

module.exports = router