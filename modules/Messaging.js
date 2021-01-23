
class Messaging{


    constructor(SQL_CONNECTION){
        this.conn = SQL_CONNECTION
    }

    getTime = ()=>{
        return (Math.round(new Date()/1000))
    }

    capitalizeFirstLetter = (string)=>{
        return string.charAt(0).toUpperCase() + string.slice(1);
      }



    getAllUserDetails = async username=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT * FROM users WHERE username=?",[username],(err,res)=>{
                if(err) console.log(err)
                return resolve({...res[0]})
            })
        })
        
    }



    checkUserExists = async(user,checkMail=false,mail=null)=>{
        return new Promise((resolve,rej)=>{
            let data = {
                without: {
                    query:"SELECT COUNT(*) AS c FROM users WHERE username = ?",
                    param:[user]
                },
                with:{
                    query:"SELECT COUNT(*) AS c FROM users WHERE username = ? OR email = ?",
                    param:[user,mail]
                }
            }
            let q,p
            if(checkMail){
                q = data.with.query,p=data.with.param
            }
            else{
                q = data.without.query,p=data.without.param
            }
            this.conn.query(q,p,(err,res)=>{
                if(err){
                    console.log(err)
                    rej(err)
                }
                return resolve(res[0].c > 0)
            })
        })
    }

    checkMessageExists = async (id)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT COUNT(*) AS c FROM messages WHERE id = ?",[id],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c > 0)
            })
        })
    }



    countFromLastDeletion = async (user,contact,last)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) as c FROM messages WHERE (sender = ? AND receiver = ?) OR (sender = ? and receiver = ?) AND id > ?",[user,contact,contact,user,last],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c)
            })
        })
    }



    getMessagesCount = async (user, contact,countDeleted=true,isGroup=false)=>{
        return new Promise((resolve,rej)=>{
            let queries = [
                {
                    q:"SELECT COUNT(*) as c FROM messages WHERE (sender = ? AND receiver = ?) OR (sender = ? and receiver = ?)",
                    p:[user,contact,contact,user]
                },
                {
                    q:"SELECT COUNT(*) as c FROM messages WHERE ((sender = ? AND deleted_for_me=0) AND receiver = ?) OR (sender=? AND receiver=?)",
                    p:[user,contact,contact,user]
                },
                {
                    q:"SELECT COUNT(*) as c FROM messages WHERE groupID = ? AND NOT EXISTS (SELECT * FROM messages_groups_deleted WHERE deleter = ? AND ( (messages.id <= messageID AND isSingleMessage = 0) OR (messages.id = messageID AND isSingleMessage = 1) ) )",
                    p:[parseInt(contact),user]
                },
            ]

            if(countDeleted && !isGroup){
                this.conn.query(queries[0].q,queries[0].p,(err,res)=>{
                    if(err) rej(err)
                    return resolve(res[0].c)
                })
            }
            else if(!countDeleted){
                this.conn.query(queries[1].q,queries[1].p,(e,r)=>{
                    if(e) rej(err)
                    return resolve(r[0].c)
                })
            }
            else{
                this.conn.query(queries[2].q,queries[2].p,(e,r)=>{
                    if(e) rej(e)
                    return resolve(r[0].c)
                })
            }
        })
    }


    isMuted = async (user,other)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT COUNT(*) as c FROM muted_convo WHERE muter = ? AND muted = ?",[user,other],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c > 0)
            })
        })
    }


    hasMessagesAfterDeletion = async (lstID,user,contact)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT COUNT(*) AS c FROM messages WHERE (((sender = ? OR receiver = ?)) AND ((sender = ? OR receiver = ?))  AND id > ? )",[user,user,contact,contact,lstID],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c > 0)
            })
        })
        
    }



    toggleMute = async (muter,muted,type)=>{
        return new Promise(async (resolve, reject) => {
            let response = {done:true};
            let inps = [muter,muted]
            let queries = ["DELETE FROM muted_convo WHERE muter = ? AND muted = ?","INSERT INTO muted_convo(muter,muted) VALUES(?,?)"]
            let query;
            let isMuted = await this.isMuted(muter,muted)
                if(isMuted && type=="unmute"){
                    query = queries[0]
                }
                else if(!isMuted && type=="mute"){
                    query = queries[1]
                }
                else{
                    response.done = false
                    return resolve(response)
                }
                this.conn.query(query,inps,(err,res)=>{
                    if(err) console.log(err)
                    return resolve(response)
                })
        })
    }


    blockExists = async (user,other,absolute=false)=>{
        return new Promise((resolve, reject) => {
            let query,params;
            let data = [
                {
                    query: "SELECT COUNT(*) as c from blockings WHERE (blocker = ? AND blocked = ?) OR (blocker=? AND blocked=?)",
                    params: [user,other,other,user]
                },
                {
                    query: "SELECT COUNT(*) as c from blockings WHERE (blocker = ? AND blocked = ?)",
                    params: [user,other]
                }
            ]
            if(absolute){
                query = data[0].query
                params = data[0].params
            }
            else{
                query = data[1].query
                params = data[1].params
            }
            this.conn.query(query,params,(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c > 0)
            })
        })
    }


    setMessageAsShown = async (id)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("UPDATE messages SET is_loaded = 1 WHERE id = ?",[id],(err,res)=>{
                if(!err) return resolve(true)
                else return resolve(false)
            })
        })
        
    }

    checkGroupExists = async(gID)=>{
        return new Promise((resolve,reject)=>{
            this.conn.query("SELECT COUNT(*) as c FROM messages_groups WHERE groupID = ?",gID,(err,res)=>{
                if(err) reject(err)
                resolve(res[0].c>0)
            })
        })
    }


    sendMsg = async (sender,receiver,sending_UA,content,groupID=-1,replyToMsgID=-1,isHint=0)=>{
        return new Promise(async(resolve) => {
            let blockExists = groupID == -1 ? await this.blockExists(sender,receiver,true) : false
            let receiverExists = groupID == -1 ? await this.checkUserExists(receiver) : await this.checkGroupExists(groupID)
            let error = {error:"Either you can't send to or receive messages from this person, or it doesn't exist"}
            if(blockExists || !receiverExists || sender==receiver) return resolve(error)
            
                const tt = Math.floor(new Date() / 1000)
                content = content.replace("\n","").replace("\r","").replace("\t","")
                let data = {
                    query: "INSERT INTO messages(sender,receiver,sent_at,sending_UA,content,groupID,replyToMsgID,isHint) VALUES (?,?,?,?,?,?,?,?)",
                    params: [sender,receiver,tt,sending_UA,content,groupID,replyToMsgID,isHint] 
                }
                this.conn.query(data.query,data.params,(err,r)=>{
                    if(err) console.log(err)
                    let message = {
                        id: r.insertId,
                        sender,
                        receiver,
                        content,
                        reacts:[],
                        totalReacts:0,
                        sent_at: this.getHumanTiming(tt),
                        sending_UA,
                        read_at:0,
                        groupID,
                        isHint,
                        replyToMsgID,
                        is_loaded: 0,
                        deleted_for_me: 0,
                    }
                    return resolve(message)

                })
            })
        }


    getUserContacts = async (user,i=0)=>{
        return new Promise((resolve, reject) => {
            let start = (i*20), stop = start + 19;
            let data = {
                query:"SELECT DISTINCT contact,groupID,MAX(id) as id FROM (SELECT DISTINCT sender as contact,groupID,id FROM messages WHERE (receiver = ?) UNION (SELECT DISTINCT receiver as contact,groupID,id FROM messages WHERE (deleted_for_me=0 AND sender = ?)) )AS F WHERE NOT EXISTS( SELECT other_user FROM deleted_convo WHERE deleted_convo.other_user = f.contact AND deleted_convo.deleter = ? AND f.id <= deleted_convo.last_message_id ) GROUP BY contact,groupID ORDER BY id DESC LIMIT ?,?",
                params:[user,user,user,start,stop]
            }
            this.conn.query(data.query,data.params,(err,res)=>{
                if(err) reject(err)
                return (res.length == 0) ? resolve(false) : resolve(res) 
            })
        })
    }


    getNameFromUsername = async (username)=>{
        return new Promise((resolve, reject) => {
            if(username.length == 0) resolve(null)
            this.conn.query("SELECT lName,fName FROM users WHERE username = ?",[username],(err,res)=>{
                if(err) reject(err)
                let name = res[0].fName + " "+res[0].lName
                return resolve(name)
            })
        })
    }



    getCountOfUnreadMessages =  async (reader,sender,isGroup = false,lastRead=-1)=>{
        return new Promise(async resolve=>{
            if(isGroup){
                const hasSeenBefore = (await this.getLastUserReadInGroupSeenMessageRow(reader,sender))
                if(hasSeenBefore) lastRead = hasSeenBefore.lastRead
            }
            const data = [
                {
                    q:"SELECT COUNT(*) as c FROM messages WHERE (receiver = ? AND sender = ? AND read_at = 0) AND groupID = -1",
                    p:[reader,sender]
                },
                {
                    q:"SELECT ( CASE WHEN ( EXISTS( SELECT * FROM messages WHERE groupID = ? AND id > (SELECT lastRead FROM messages_groups_read WHERE reader = ? AND groupID = ?) ) ) THEN 1 WHEN ( NOT EXISTS (SELECT * FROM messages_groups_read WHERE reader= ? AND groupID = ?) AND EXISTS(SELECT * FROM messages WHERE groupID = ?) ) THEN 1 ELSE 0 END ) AS c",
                    p:[sender,reader,sender,reader,sender,sender]
                }
            ]
            let query,param
            if(!isGroup){
                query=data[0].q
                param=data[0].p
            }
            else{
                query=data[1].q
                param=data[1].p
            }
            this.conn.query(query,param,(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c)
            })
        })
    }



    getLastMessage = async (user,contact,isGroup = false)=>{
        return new Promise((resolve,rej)=>{
            let e = [{
                query: "SELECT content as c,sent_at as s,id FROM messages WHERE ((receiver = ? AND sender = ?) OR (receiver = ? AND sender = ? AND deleted_for_me = 0)) ORDER BY id DESC LIMIT 1",
                params: [user,contact,contact,user]
            },
            {
                query: "SELECT * FROM `messages` WHERE groupID = ? AND EXISTS(SELECT id FROM messages_groups_members WHERE username = ? AND groupID = ?) AND NOT EXISTS(SELECT * FROM messages_groups_deleted as c WHERE c.deleter = ? AND c.groupID = ? AND (c.isSingleMessage = 0 AND messages.id <= c.messageID) OR (c.isSingleMessage = 1 AND messages.id = c.messageID) ) ORDER BY id DESC LIMIT 1",
                params:[contact,user,contact,user,contact]
            }
            ],data
            if(isGroup) data = e[1] 
            else data= e[0]
            this.conn.query(data.query,data.params,(err,res)=>{
                if(err) console.log(err)
                if(res.length == 0) return resolve(false)
                else{
                    return resolve([res[0].c,res[0].s,res[0].id])
                }
            })
        })
    }



    getHumanTiming = (time)=>{
        let diff = Math.round(new Date() / 1000) - time;
        let years   = Math.floor(diff / (365*60*60*24)); 
        let months  = Math.floor((diff - years * 365*60*60*24) / (30*60*60*24)); 
        let days    = Math.floor((diff - years * 365*60*60*24 - months*30*60*60*24)/ (60*60*24));
        let hours   = Math.floor((diff - years * 365*60*60*24 - months*30*60*60*24 - days*60*60*24)/ (60*60)); 
        let minutes  = Math.floor((diff - years * 365*60*60*24 - months*30*60*60*24 - days*60*60*24 - hours*60*60)/ 60);
        if(years > 0){
            if(years == 1){
                return years+" year ago";
            }
            return years+" years ago";
        }
        else if(months > 0){
            if(months == 1){
                return months+" month ago";
            }
            return years+" months ago";
        }
        else if(days > 0){
            if(days == 1){
                return days+" day ago";
            }
            return days+" days ago";
        }
        else if(hours > 0){
            if(hours == 1){
                return hours+" hour ago";
            }
            return hours+" hours ago";
        }
        else if(minutes > 0){
            if(minutes == 1){
                return minutes+" min ago";
            }
            return minutes+" min ago";
        }
        else{
            return "seconds ago";
        }
    }



    isFirstMessage = async (user,sender)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT COUNT(*) as c FROM messages WHERE ((sender = ? AND receiver = ?) or (sender = ? AND receiver = ?))",[user,sender,sender,user],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c == 1)
            })
        })
    }

    getIDFromUserName = async (un)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT id FROM users WHERE username = ?",[un],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].id)
            })
        })
    }

    getUserNameFromID = async(id)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT username FROM users WHERE id = ?",id,(err,res)=>{
                if(err) rej(err,id)
                return resolve(res[0].username)
            })
        })
    }

    getMessageParts = async (id)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT sender,receiver FROM messages WHERE id = ?",[id],(err,res)=>{
                if(err) console.log(err)
                let rsp = {}
                rsp.sender = res[0].sender
                rsp.receiver = res[0].receiver
                return resolve(rsp)
            })
        })
    }


    getMessageReacts = async (messageID)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT reactor as r , react_type as rt FROM messages_reacts WHERE message_id = ? ORDER BY time DESC",[messageID],(err,res)=>{
                if(err) console.log(err)
                if(res.length == 0) return resolve(false)
    
                let reactData = {reacts:[]}
                let collector =  {}
                reactData.totalReacts = res.length
                collector.reactor = res[0].r
                collector.react_type = res[0].rt
                reactData.reacts.push(collector)
                return resolve(reactData)
            })
        })
    }


    checkIfAlreadyReacted = async (user,id)=>{
        return new Promise(async (resolve, reject) => {
            if(!(await this.getMessageReacts(id))) return resolve(false)
            this.conn.query("SELECT * FROM messages_reacts WHERE message_id = ? AND reactor = ?",[id,user],(err,res)=>{
                if(err) console.log(err)
                if(res.length == 0) return resolve(false)
                return resolve(true)
            })
        })
    }




    reactOnMessage = async (user,messageid,reacttype,updating=false)=>{
        return new Promise((resolve, reject) => {
            let query,param,msg;
            let data = [
                {
                    q:'INSERT INTO messages_reacts(reactor,react_type,message_id) VALUES (?,?,?)',
                    p:[user,reacttype,messageid],
                    m:'just reacted !'
                },
                {
                    q:'UPDATE messages_reacts SET react_type = ? WHERE reactor= ? AND message_id = ?',
                    p:[reacttype,user,messageid],
                    m:'just updated !'
                }
            ]
            if(!updating){
                query = data[0].q
                param = data[0].p
                msg   = data[0].m
            }
            else{
                query = data[1].q
                param = data[1].p
                msg   = data[1].m
            }
            this.conn.query(query,param,(err,res)=>{
                if(err) console.log(err)
                return resolve({success:true,message:msg})
            })
        })
    }




    removeReact = async (user,messageid)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("DELETE FROM messages_reacts WHERE reactor = ? AND message_id = ?",[user,messageid],(err,res)=>{
                if(err) console.log(err)
                return resolve({success:true,message:'just removed !'})
            })
        })
    }




    sameReaction = async (messageID,user,type)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT COUNT(*) AS c FROM messages_reacts WHERE reactor = ? AND message_id = ? AND react_type = ?",[user,messageID,type],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].c>0)
            })
        })
    }




    blockUser = async (user,other,cb)=>{
        return new Promise(async (resolve, reject) => {
            let data = {success:true}
            if(await this.blockExists(user,other)){
                data.success = false
                data.message = "already blocked"
                return cb(data)
            }
            else{
                let tt = Math.round(new Date() / 1000)
                this.conn.query("INSERT INTO blockings(blocker,blocked,time) VALUES (?,?,?)",[user,other,tt],(err,res)=>{
                    if(err) console.log(err)
                    return resolve(data)
                })
            }
        })
    }




    unblockUser = async (user,other)=>{
        return new Promise(async (resolve, reject) => {
            let data = {success:true}
            if(await this.blockExists(user,other)){
                this.conn.query("DELETE FROM blockings WHERE blocker = ? AND blocked = ?",[user,other],(err,res)=>{
                    if(err) console.log(err)
                    return resolve(data)
                })
            }
            else{
                data.success = false
                data.message = "no such record"
                return resolve(data)
            }
        })
        
    }




    blockProcess = async (type,blocker,blocked)=>{
        return new Promise(async (resolve, reject) => {
            switch(type){
                case 'block': 
                    return resolve(await this.blockUser(blocker,blocked))
                    break;
                case 'unblock':
                    return resolve(await this.unblockUser(blocker,blocked))
                    break;
                default:
                    return resolve({success:false,message:"undefined type"})
            }
        })
    }



    reactProcess = async (user,messageid,reacttype)=>{
        return new Promise(async (resolve, reject) => {
            if(await this.sameReaction(messageid,user,reacttype)){
                return resolve(await this.removeReact(user,messageid))
            }
            else{
                let has = await this.checkIfAlreadyReacted(user,messageid);
                if(has){
                    return resolve(await this.reactOnMessage(user,messageid,reacttype,true))
                }
                else{
                    return resolve(await this.reactOnMessage(user,messageid,reacttype))
                }
            }
        })
    }




    getLastOnline = async(user)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("SELECT last_online as l FROM users WHERE username = ?",[user],(err,res)=>{
                if(err) console.log(err)
                return resolve(res[0].l)
            })
        })
    }

    lastDeletedMessageID = async(user,contact)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT last_message_id as lastDeleted FROM deleted_convo WHERE deleter = ? AND other_user = ?",[user,contact],(err,res)=>{
                if(err) console.log(err)
                if(res.length == 0){
                    return resolve(false)
                }
                else{
                    return resolve(res[0].lastDeleted)
                }
            })
        })
        
    }


    searchNewReceivers = async (user,keyword)=>{
        return new Promise(async (resolve, reject) => {
            let key = "%"+keyword+"%"
            this.conn.query("SELECT * FROM users WHERE username LIKE ? AND NOT username = ? LIMIT 6",[key,user],async (err,res)=>{
                if(err) console.log(err)
                let all = [],i;
                for(i=0;i<res.length;i++){
                    let row = res[i]
                    if(await this.blockExists(user,row.username,true)) continue
                    let r = await this.getMessagesCount(user,row.username,true)
                    let nm = row.fName + " "+ row.lName
                    let format = {
                        name: nm,
                        profilePic: nm.replace(" ","+"),
                        spokeBefore: r>0 ? true : false,
                        username: row.username
                    }
                    all.push(format)
                    if(i == res.length -1){
                        return resolve(all)
                    }
                }
            })
        })
    }



    getGroupName = async(gID)=>{
        return new Promise(async(resl,rej)=>{
            this.conn.query("SELECT groupName from messages_groups WHERE groupID = ?",gID,(err,res)=>{
                if(err) rej(err)
                return resl(res[0].groupName)
            })
        })
    }

    getGroupDetails = async(gID)=>{
        return new Promise(async(resl,rej)=>{
            this.conn.query("SELECT * from messages_groups WHERE groupID = ?",gID,(err,res)=>{
                if(err) rej(err)
                return resl(res[0])
            })
        })
    }

    processContactsLastMessages = async(currentUser,res)=>{
        return new Promise(async r=>{
            let wholeData = []
            for(const row of res){
                const isGroup = row.groupID !== -1,
                contact = !isGroup ? (row.sender == currentUser ? row.receiver : row.sender) : null, //currentUsername
                isBlocker = !isGroup ? await this.blockExists(currentUser,contact) : null,
                isBlocked = !isGroup ? await this.blockExists(contact,currentUser) : null,
                isMuted = !isGroup ? await this.isMuted(currentUser,contact) : false,
                messagesCount =  !isGroup ? await this.getMessagesCount(currentUser,contact,false) : await this.getMessagesCount(currentUser,row.groupID,false,true),
                groupName = isGroup ? await this.getGroupName(row.groupID) : null,
                creator = isGroup ? await this.getGroupCreator(row.groupID,true) : null,
                name = !isGroup ? await this.getNameFromUsername(contact) : null,
                isOnline = !isGroup ? this.getTime() - await this.getLastOnline(contact) <= 60 : null,
                profilePic = "",
                unreadCount = !isGroup ? await this.getCountOfUnreadMessages(currentUser,contact) : await this.getCountOfUnreadMessages(currentUser,row.groupID,true),
                lastMessage = {...row,sent_at:this.getHumanTiming(row.sent_at)},
                id = !isGroup ? await this.getIDFromUserName(contact) : row.groupID
                const data = {
                    id,
                    isGroup,
                    contact,
                    groupName,
                    isBlocker,
                    isBlocked,
                    isMuted,
                    messagesCount,
                    creator,
                    name,
                    isOnline,
                    profilePic,
                    unreadCount,
                    lastMessage,
                }
                wholeData.push(data)
            }
            r(wholeData)
        })
    }



    // the new one
    loadMessages = async(user,chatIndex)=>{
        return new Promise((resolve,reject)=>{
            const start = chatIndex * 20,
            finish = start +19 ,
            data = {
                q: `(SELECT * FROM messages WHERE id IN (
                    SELECT DISTINCT MAX(id) as id FROM 
                        (
                            SELECT DISTINCT sender as contact,groupID,id FROM messages WHERE (receiver = ?)
                            UNION 
                            (SELECT DISTINCT receiver as contact,groupID,id FROM messages WHERE (deleted_for_me=0 AND sender = ?)
                         ) 
                    ) AS F 
                    WHERE 
                        groupID = -1 
                        AND
                        NOT EXISTS( 
                            SELECT other_user FROM deleted_convo WHERE 
                                deleted_convo.other_user = f.contact AND deleted_convo.deleter = ? AND f.id <= deleted_convo.last_message_id 
                        )
                    GROUP BY contact
                )
                )
                UNION
                (
                SELECT id,sender,receiver,sent_at,read_at,is_loaded,sending_UA,content,deleted_for_me,replyToMsgID,groupID,isHint FROM 
                (SELECT groupID as gID FROM messages_groups_members WHERE username = ?) a
                JOIN 
                messages
                ON messages.groupID = a.gID
                AND 
                messages.id = 
                    (SELECT MAX(id) FROM messages WHERE 
                         groupID = a.gID
                         AND
                         NOT EXISTS (
                            SELECT * FROM messages_groups_deleted 
                            WHERE 
                                deleter = ? 
                                AND 
                                groupID = a.gID 
                                AND ( 
                                    (messageID >= messages.id AND isSingleMessage=0) OR (messageID = messages.id AND isSingleMessage = 1) 
                                )
                        )
                     )
                 
                GROUP BY a.gID
                )
                ORDER BY id DESC
                LIMIT ?,?`,
                p:[user,user,user,user,user,start,finish]
            }
            this.conn.query(data.q,data.p,async (err,res)=>{
                if(err) reject(err)
                if(res== undefined) resolve([])
                if(res.length === 0) console.log("No more messages for "+user)
                const wholeData = await this.processContactsLastMessages(user,res)
                return resolve(wholeData)
            })
        })
    }

    //mrigla
    getGroupCreator = async(groupID,getName=false)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT creatorID FROM messages_groups WHERE groupID = ?",[groupID],async (err,res)=>{
                if(err) rej(err)
                let resp
                if(getName) resp =  (await this.getUserNameFromID(res[0].creatorID))
                else resp = (res[0].creatorID)
                resolve(resp)
            })
        })
    }

    getMessageInGroupViewers = async (msgID)=>{
        return new Promise(resolve=>{
            this.conn.query("SELECT time,reader as viewer FROM messages_groups_read WHERE lastRead = ?",msgID,(err,res)=>{
                if(err) console.log(err)
                let viewers = []
                for(const x of res){
                    let obj = {...x}
                    viewers.push(obj)
                }
                resolve(viewers)
            })
        })
    }

    //mrigla
    getGroupMembers = async(groupID)=>{
        return new Promise((resolve,rej)=>{
            this.conn.query("SELECT memberID FROM messages_groups_members WHERE groupID = ?",[groupID],(err,res)=>{
                if(err) rej(err)
                let members = res.forEach(v=>v.memberID)
                return resolve(members)
            })
        })
    }


    // setUserOnline = async (user)=>{
    //     return new Promise((resolve, reject) => {
    //         let t = this.getTime()
    //         this.conn.query("UPDATE users SET last_online = ? WHERE username = ?",[t,user],(err,res)=>{
    //             if(err) console.log(err)
    //             if(!err) return resolve(true)
    //             else return reject({error:"An error occured"})
    //         })
    //     })
        
    // }




    // updateDetails = async (user,loadedTimes)=>{
    //     return new Promise(async(resolve, reject) => {
    //         let all=[], contacts = []

            
    //         let i =-1
    //         while(i<loadedTimes){
    //             let d = this.getUserContacts(user,i+1)
    //             if(!d) break
    //             contacts = [...contacts,...d]
    //             i++
    //         }
    //         if(contacts.length == 0) resolve({error:"no contacts to update details for"})
    //         contacts.forEach(async (c,ii)=>{
    //             let last = await this.getLastMessage(user,c)
    //             let time = this.getHumanTiming(last[1])
    //             let isOnline = ( this.getTime() - this.getLastOnline(c) > 60) ? false : true
    //             let temp = {
    //                 lastMsg: time,
    //                 online: isOnline
    //             }
    //             all.push(temp)
    //             if(ii == contacts.length-1) 
    //             return resolve(all)
    //         })
    //     })
    // }


    // checkNewMessages = (user)=>{
    //     return new Promise((resolve, reject) => {
    //         let all = []
    //         this.conn.query("SELECT sender FROM messages WHERE receiver = ? AND is_loaded = 0 GROUP BY sender ORDER BY sent_at DESC",[user],async (err,sender)=>{
    //             if(err) console.log(err)
    //             sender.forEach(async(res,o)=>{
    //                 let senderDetails = await this.getAllUserDetails(res.sender)
    //                 this.conn.query("SELECT * FROM messages WHERE receiver = ? AND  sender= ? AND is_loaded = 0 ORDER BY sent_at DESC",[user,senderDetails.username],(err,msg)=>{
    //                     //r is sql result
    //                     if(err) console.log(err)
    //                     msg.forEach(async (r,oo)=>{
    //                             let name = senderDetails.fName+" "+senderDetails.lName

    //                             let message = {
    //                                 id: r.id,
    //                                 sender: senderDetails.username,
    //                                 receiver: user,
    //                                 content: r.content,
    //                                 loadedToDom: r.is_loaded,
    //                                 sent_at: this.getHumanTiming(r.sent_at),
    //                                 sending_UA: r.sending_UA,
    //                                 read_at: r.read_at
    //                             }

    //                             let clientAndMessages = {
    //                                 id: senderDetails.id,
    //                                 contact: senderDetails.username,
    //                                 name: name,
    //                                 profilePic: name.replace(" ","+"),
    //                                 muted: await this.isMuted(user,senderDetails.user),
    //                                 isFirst: await this.isFirstMessage(user,senderDetails.username),
    //                                 messagesCount: await this.getMessagesCount(user,senderDetails.username),
    //                                 unreadCount: 1,
    //                                 messages: []
    //                             }
    //                             await this.setMessageAsShown(message.id)
    //                             clientAndMessages.messages.push(message)
    //                             all.push(clientAndMessages)
    //                             if(o == sender.length-1 && oo == msg.length-1){
    //                                 return resolve(all)
    //                             }
    //                         })
    //                     })
    //                 })
    //         })
    //     })
        
    // }

    readFullConvo = async(user,other,isGroup=false)=>{
        return new Promise(async resolve => {
            const data = [
                {
                    q:"UPDATE messages SET read_at = ? WHERE receiver = ? AND sender = ? AND read_at = 0",
                    p:[this.getTime(),user,other]
                },
            ]
            if(!isGroup){
                this.conn.query(data[0].q,data[0].p,(err)=>{
                    if(err){
                        console.log(err)
                    }
                    resolve(true)
                })
            }
            else{
                //getting last undeleted, for our user, group message
                const 
                lastGroupMessage = await this.getLastMessage(user,parseInt(other),true),
                lastRead  = await this.getLastUserReadInGroupSeenMessageRow(user,parseInt(other))
                if(lastGroupMessage == 0) resolve(false)

                resolve(await this.UpdateOrInsertLastReadGroupMessage(user,parseInt(other),lastRead,lastGroupMessage[2]))
            }
        })
        
    }


    UpdateOrInsertLastReadGroupMessage = async(reader,groupID,lastReadRow,lastGroupMessage)=>{
    return new Promise(async(resolve)=>{
            const time = Math.floor(Date.now()/1000)
            if(lastReadRow){
                this.conn.query(
                    "INSERT INTO messages_groups_read(id,time,groupID,reader,lastRead) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE lastRead = ?,time = ?",
                    [lastReadRow.id,time,groupID,reader,lastGroupMessage,lastGroupMessage,time],
                    (err)=>{
                        if(err) resolve(false)
                        return resolve(true)
                    }
                )
            }
            else{
                this.conn.query(
                    "INSERT INTO messages_groups_read(time,groupID,reader,lastRead) VALUES(?,?,?,?)",
                    [time,groupID,reader,lastGroupMessage],
                    (err)=>{
                        if(err) resolve(false)
                        return resolve(true)
                    }
                )
            }
        })
    }


    getLastUserReadInGroupSeenMessageRow = async(user,groupID)=>{
        return new Promise(resolve=>{
            this.conn.query("SELECT * FROM messages_groups_read WHERE groupID = ? AND reader = ?",[groupID,user],(error,result)=>{
                if(error) console.log(error)
                if(result.length==0) resolve(false)
                resolve(result[0])
            })
        })
    }



    deleteConvo = async(deleter,other,lastid)=>{
        return new Promise(async (resolve, reject) => {
            let checkDel = await this.lastDeletedMessageID(deleter,other)
            let query,param,data = [
                {
                    q:"UPDATE deleted_convo SET last_message_id = ? WHERE deleter = ? AND other_user = ?",
                    p:[lastid,deleter,other]
                },
                {
                    q:"INSERT INTO deleted_convo(deleter,other_user,last_message_id) VALUES (?,?,?)",
                    p:[deleter,lastid,other]
                }
            ]
            if(checkDel){
                query = data[0].q
                param = data[0].p
            }
            else{
                query = data[1].q
                param = data[1].p
            }
            this.conn.query(query,param,(er,res)=>{
                if(er){
                    console.log(er)
                    return reject(false)
                }
                return resolve(true)
            })
        })
        
    }



    deleteMessageForMe = async (user,id)=>{
        return new Promise((resolve, reject) => {
            this.conn.query("UPDATE messages SET deleted_for_me = 1 WHERE sender = ? AND id = ?",[user,id],(err,res)=>{
                if(err){
                    console.log(err)
                    return reject({success:false})
                }
                return resolve({success:true})
            })
        })   
    }

    getMessage = async (id)=>{
        return new Promise(res=>{
            this.conn.query("SELECT * FROM messages WHERE id = ?",id,(err,r)=>{
                res(r[0])
            })
        })
    }

    paginateMessages = async(user,contact,index,isGroup=false)=>{
        if(index == -1 || contact == null || user == null) return [];
        return new Promise(async(resolve, reject) => {
            let start = 20 * index,finish=20,query,params;
            let data = [
                {
                    q:"SELECT * FROM messages WHERE ((sender = ? AND deleted_for_me = 0 AND receiver = ?) OR (sender = ? AND receiver = ?)) AND NOT EXISTS ( SELECT * FROM deleted_convo WHERE messages.id <= last_message_id AND deleter = ? AND other_user = ? ) ORDER BY sent_at DESC LIMIT ?,?",
                    p:[user,contact,contact,user,user,contact,start,finish]
                },
                {
                    q:"SELECT * FROM messages WHERE groupID = ? AND NOT EXISTS (SELECT * FROM messages_groups_deleted WHERE deleter = ? AND groupID = ? AND ( CASE WHEN isSingleMessage = 0 THEN messages.id <= messageID ELSE messages.id = messageID END ) ) ORDER BY sent_at DESC LIMIT ?,?",
                    p:[parseInt(contact),user,parseInt(contact),start,finish]
                },
            ]
            let wholeData = {
                contact: contact,
                messagesCount: await this.getMessagesCount(user,contact,false,isGroup),
                profilePic: !isGroup ? (await this.getNameFromUsername(contact)).replace(" ","+"):"RANDOM",
                data:[]
            }
            if(isGroup && parseInt(contact) !== NaN){
                //1
                query = data[1].q
                params = data[1].p
            }
            else{
                query=data[0].q
                params=data[0].p
            }
            this.conn.query(query,params,async(err,res)=>{
                if(err) return console.log(err)
                for(var i=0;i<res.length;i++){
                    let row = res[i]
                    if(row.deleted_for_me == 1 && row.sender == user){
                        continue
                    }
                    let messageData = {...row,sent_at:this.getHumanTiming(row.sent_at)}
                    const reacts = await this.getMessageReacts(row.id),
                    replyID = row.replyToMsgID,
                    viewers = await this.getMessageInGroupViewers(row.id)
                    if(reacts){
                        messageData = {...messageData,...reacts}
                    }
                    if(replyID !== -1){
                        let repliedTo = await this.getMessage(replyID)
                        messageData = {
                            ...messageData,
                            replyDetails:{
                                sender: repliedTo.sender,
                                sent_at: this.getHumanTiming(repliedTo.sent_at),
                                content: repliedTo.content
                            }
                        }
                    }
                    if(viewers.length>0){
                        messageData = {
                            ...messageData,
                            viewers
                        }
                    }
                    wholeData.data.push(messageData)
                }
                return resolve(wholeData)
            })
        })
        
    }


    searchChats = async(user,value)=>{
        return new Promise((resolve, reject) => {
            value = "%"+value+"%"
            const data = {
                q: `
                SELECT * FROM ((SELECT * FROM messages WHERE id IN (
                    SELECT DISTINCT MAX(id) as id FROM 
                        (
                            SELECT DISTINCT sender as contact,groupID,id FROM messages WHERE (receiver = ?)
                            UNION 
                            (SELECT DISTINCT receiver as contact,groupID,id FROM messages WHERE (deleted_for_me=0 AND sender = ?)
                         ) 
                    ) AS F 
                    WHERE 
                        groupID = -1 
                        AND
                        NOT EXISTS( 
                            SELECT other_user FROM deleted_convo WHERE 
                                deleted_convo.other_user = f.contact AND deleted_convo.deleter = ? AND f.id <= deleted_convo.last_message_id 
                        )
                    GROUP BY contact
                )
                )
                UNION
                (
                SELECT id,sender,receiver,sent_at,read_at,is_loaded,sending_UA,content,deleted_for_me,replyToMsgID,groupID,isHint FROM 
                (SELECT groupID as gID FROM messages_groups_members WHERE username = ?) a
                JOIN 
                messages
                ON messages.groupID = a.gID
                AND 
                messages.id = 
                    (SELECT MAX(id) FROM messages WHERE 
                         groupID = a.gID
                         AND
                         NOT EXISTS (
                            SELECT * FROM messages_groups_deleted 
                            WHERE 
                                deleter =? 
                                AND 
                                groupID = a.gID 
                                AND ( 
                                    (messageID >= messages.id AND isSingleMessage=0) OR (messageID = messages.id AND isSingleMessage = 1) 
                                )
                        )
                     )
                GROUP BY a.gID
                )) e
                WHERE 
                    (CASE WHEN sender = ? THEN receiver WHEN receiver = ? THEN sender END) LIKE ?
                 OR
                    (SELECT groupName FROM messages_groups WHERE groupID = e.groupID) LIKE ?
                ORDER BY id DESC`,
                p:[user,user,user,user,user,user,user,value,value]
            }
            this.conn.query(data.q,data.p,async (err,res)=>{
                if(err) reject(err)
                const whole = await this.processContactsLastMessages(user,res)
                return resolve(whole)
            })
        })
    }

}

module.exports = Messaging