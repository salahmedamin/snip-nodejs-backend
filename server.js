const express = require("express")
const GLOBAL_MIDDLEWARE = require("./middleware/process")
const TOKEN_MIDDLEWARE = require("./middleware/tokenVerif")
require('dotenv').config()
const app = express(),
bodyParser = require('body-parser'),
cors = require("cors"),
sql = require("./sql_conn"),
jwt = require("jsonwebtoken"),
corsOptions = {
    origin: 'http://localhost:3600',
    methods: ['GET', 'POST'],
    allowedHeaders: "Content-Type",
    credentials: true,
    exposedHeaders: 'Access-Token',
};

const UserClass = require("./modules/User")
const messagesRoute = require("./routes/Messaging/messages");
const cookieParser = require("cookie-parser");
const User = new UserClass(sql)

//socketio
const http = require('http').Server(app);
const io = require("socket.io")(http, {
    cors: {
      origin: "http://localhost:3600",
      methods: ["GET", "POST"]
    }
});
app.io = io

app.use(bodyParser.urlencoded({extended:true}))
app.use(cookieParser(process.env.JWT_SECRET))
app.use(express.json())
app.use(cors(corsOptions))
app.use(GLOBAL_MIDDLEWARE)
//app.use(TOKEN_MIDDLEWARE)
app.use("/messages",messagesRoute)

app.post("/checkUsername",async(req,res)=>{
    res.send(await User.checkUserExists(req.body.username))
})
app.post("/signup",async(req,res)=>{
    res.send(await User.signUp(req.body.fName,req.body.lName,req.body.email,req.body.password,req.body.username))
})
app.post("/forgotPass",async(req,res)=>{
    if(await User.checkUserExists(req.body.email)){
        // SEND AN EMAIL
    }
})
app.post("/signin",async(req,res)=>{
    try{
    const {email,password} = req.body
    let resp = await User.signin(email,password,req)
    if(!resp.success) res.end(JSON.stringify(resp))
    else{
        if(!res.headersSent){
            let JWT_TOKEN = jwt.sign({...resp.userRecords,exp:Math.floor(Date.now()/1000)+(3600*24*7)},process.env.JWT_SECRET)
            //res.cookie('Authorization', 'Bearer '+ JWT_TOKEN, {maxAge: 3600*24*30, httpOnly: true, secure: false,signed:true });
            res.header('Access-Token',JWT_TOKEN)
            res.send(JSON.stringify(resp))
        }
        else{
            res.end()
        }
    }
    }
    catch(err){
        console.log(err.message)
    }
})

app.post("/tokenVerif",async(req,res)=>{
    res.send(await TOKEN_MIDDLEWARE(req.body.token))
})

app.listen(2500)
console.log("Listening on port 2500")




// socket part
let clients = []
io.on('connection', (socket) => {
    //when connected, add client to clients array, if new device but same username, add only device (device=>socket.id)
    const username = socket.request._query.username
    if(username !== undefined){
        let counter = 0,found=false
        while(counter<clients.length){
            let row = clients[counter]
            if(row.username == username){
                clients[counter].devices = [
                    ...clients[counter].devices,
                    {id:socket.id}
                ]
                found = true
                break
            }
            counter++
        }
        if(!found){
            const client = {
                    username,
                    devices: [
                        {id: socket.id}
                    ]
            }
            clients.push(client)
        }
    }
    

    //disconnecting part
    socket.on("getOut",(data)=>{
        const username = data.username,
        id=socket.id
        let c1=0
        while(c1<clients.length){
            if(clients[c1].username == username){
                if(clients[c1].devices.length == 1){
                    clients = clients.splice(c1,1)
                    break
                }
                else{
                    clients[c1].devices = clients[c1].devices.filter(dev=>{
                        dev.id !== id
                    })
                    break
                }
            }
            c1++
        }
    })
    socket.on('disconnect', ()=>{
        let i=j=0,found=false
        while(i<clients.length){
            while(j<clients[i].devices.length){
                if(clients[i].devices[j].id == socket.id){
                    clients[i].devices.splice(j,1)
                    found = true
                    break;
                }
            }
            if(found) break
            i++
        }
     });

    //sending message part

    
});

http.listen(3000, () => {
    console.log('listening on 3000 for socket.io');
});