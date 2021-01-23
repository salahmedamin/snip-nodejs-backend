const checkings = require("./checkings")
const { availableEmail,isEmail,messageExists,userExists,maxLength,minLength,required,type,pastTime,validEmoji,validToken } = checkings
module.exports = {
    additional:{
        maxLength,
        minLength,
        required,
        type,
        validToken
    },
    signin:{
        //recaptched: true,
        email: {
            required: true,
            type:"string",
            fn: [isEmail]
        },
        password:{
            required:true,
            type:"string",
            minLength:8
        }
    },
    signup:{
        recaptched: true,
        email:{
            required: true,
            type: "string",
            minLength: 6,
            fn:[isEmail,availableEmail]
        },
        password:{
            required:true,
            type:"string",
            minLength: 8
        },
        username:{
            required:true,
            type:"string",
            minLength: 3,
            fn:[(v)=>!userExists(v)]
        },
        fName:{
            required:true,
            type:"string",
            minLength: 2
        },
        lName:{
            required:true,
            type:"string",
            minLength: 2
        }
    },
    forgotPassword:{
        recaptched:true,
        email:{
            required: true,
            type: "string",
            minLength: 6,
            fn:[isEmail]
        }
    },
    checkUsername:{
        username:{
            required: true,
            type: "string",
            minLength: 3,
            fn:[v=>!userExists(v)]
        }
    },
    changePassword:{
        recaptched: true,
        token:{
            type:"string",
        },
        email:{
            required: true,
            type: "string",
            minLength: 6,
            fn:[isEmail]
        }
    },
    messages:{
        loadChats:{
            user:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            index:{
                type:"number",
                required: true
            },
            token:{
                type:"string",
                required:true
            }
        },
        updateDetails:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            index:{
                type:"number",
                required: true
            }
        },
        paginate:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            other:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            index:{
                type:"number",
                required: true
            },
            token:{
                type:"string",
                required:true
            }
        },
        searchChats:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            keyword:{
                type:"string",
                required:true,
                minLength:1
            },
            token:{
                type:"string",
                required:true
            }
        },
        searchNewReceivers:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            keyword:{
                type:"string",
                required:true,
                minLength:1
            },
            token:{
                type:"string",
                required:true
            }
        },
        deleteForMe:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            messageId:{
                type:"number",
                required:true,
                minLength:1,
                fn:[messageExists]
            },
            token:{
                type:"string",
                required:true
            }
        },
        deleteFullConvo:{
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            other:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            isGroup:{
                type:"boolean",
                required:"true",
            },
            lastMessageId:{
                type:"number",
                required:true,
                minLength: 1,
                fn:[messageExists]
            },
            token:{
                type:"string",
                required:true
            }
        },
        blocking:{
            type:{
                type:"string",
                required:true,
                fn:[(v)=>(['block','unblock'].includes(v))]
            },
            username:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            other:{
                type:"string",
                required:true,
                minLength:3,
                fn:[userExists]
            },
            token:{
                type:"string",
                required:true
            }
        },
        sendMessage:{
            sender:{
                required: true,
                type: "string",
                minLength: 3,
                fn:[userExists]
            },
            receiver:{
                required:true,
                type:"string",
                minLength: 3,
                fn:[userExists]
            },
            content:{
                required:true,
                type:"string",
                maxLength: 500,
                minLength: 1
            },
            token:{
                type:"string",
                required:true
            }
        },
        reactOnMessage:{
            reactor: {
                type:"string",
                required:true,
                minLength:3,
                fn: [userExists]
            },
            react_type:{
                type:"string",
                required: true,
                fn:[validEmoji]
            },
            time:{
                type: "number",
                required: true,
                fn:[pastTime]
            },
            token:{
                type:"string",
                required:true
            }
        },
        readFullConvo:{
            user:{
                type:"string",
                required: true,
                minLength: 3,
                fn:[userExists]
            },
            other:{
                type:"string",
                required:true,
                minLength: 3,
                fn:[userExists]
            },
            isGroup:{
                type:"boolean",
                required:false,
            },
            token:{
                type:"string",
                required:true
            }
        }
    },
    tokenVerif:{
        token:{
            type:"string",
            required:true
        }
    }
}