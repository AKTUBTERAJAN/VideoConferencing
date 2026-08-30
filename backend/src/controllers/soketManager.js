import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeonline  = {};

const connectToSocketIO = (server) => {
    const io = new Server(server,{
        cors:{
        origin:"*",
        methods:["GET","POST"],
        alloweHeaders:["*"],
        Credential:true,
    }
    });
    
    
    io.on("connection", (socket) => {

        socket.on("join-call",(path) =>{
            if(connections[path] === undefined){
                connections[path] = [];
            }
            connections[path].push(socket.id);
            timeonline[socket.id] = new Date();

            for(let a =0; a<connections[path].length; a++){
                io.to(socket.id).emit("chat-message",messages[path][a]['data'],
                    messages[path][a]['sender'],messages[path][a]['soket-id-sender']);
            }
        })

        socket.on("signal",(toId,message) =>{
            io.to(toId).emit("signal",socket.id,message);
        })

        socket.on("chat-message",(data,sender) =>{
            const[matchingRoom,Found] = object.entries(connections)
            .reduce(([room,isFound],[roomKey,roomValue])=>{
                if(!isFound && roomValue.includes(socket.id)){
                    return [roomKey,true];
                }
                return [roomKey,isFound];
            },['',false]);
            if(Found === true){
                if(messages[matchingRoom] === undefined){
                    messages[matchingRoom] = []
                }
                messages[matchingRoom].push({'sender':sender,"data":data,"socket-id-sender":socket-id});
                console.log("message",Key,":",sender,data)

                connections[matchingRoom].forEach((elem) =>{
                    io.to(elem).emit("chat-message",data,sender,socket.id)
                })
            }
        })

        socket.on("disconnect", () => { 
            var diffTime = Math.abs(timeonline[socket.id] - new Date())

            var key 

            for(const [ k,v] of JSON.parse(JSON.stringify(object.entries(connections)))){
                for(let a =0;a<v.length;++a){
                   if(v[a] === socket.id){
                    key = k


                    for(let a =0;a<connections[key].length;++a){
                        io.to(connections[key][a]).emit('user-left',socket.id)
                    }

                    var index = connections[key].indexof(socket.id)

                    connections[key].splice(index,1)

                    if(connections[key].length === 0){
                        delete connections[key]
                    }
                   }

                }
            }
    })


});

};

export default connectToSocketIO;