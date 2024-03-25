require("dotenv").config();
const express = require("express");
// const cors = require('cors')
const app = express();
const http = require("http");
const {
  connectToRedis,
  fetchDataForRoom,

  createUser,
  userEndGame,
} = require("./redis-db");
// app.use(cors)
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const users = [];
const roomsVsUsers = {};
const rooms = {
  "beginner:room": "beginner",
  "advanced:room": "advanced",
  "intermediate:room": "intermediate",
};
const levelVsKeys = {
    beginner: "beginner:room",
    advanced: "advanced:room",
    intermediate: "intermediate:room",
  };

app.get("/", async (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  socket.on("join-room", async (args) => {
    socket.join(args[0].level);
    // let existingArr = roomsVsUsers[args[0].level]
    //   ? roomsVsUsers[args[0].level]
    //   : [];
    // existingArr.push({ ...args[0], socket_id: args[1] });
    // roomsVsUsers[args[0].level] = existingArr;
    // console.log(roomsVsUsers);
    // for (let room in roomsVsUsers) {
    //   io.to(room).emit("new-users", roomsVsUsers[room]);
    // }
    await createUser(args[0]);
    // setInterval(async () => {
    //     const result = await fetchDataForRoom(levelVsKeys[args[0].level]);
    //     console.log(result);
    //     // for (let roomKey in rooms){
    //       io.to(args[1]).emit("winners-user", result);
    // // }
    //   }, 10000);
  });

  socket.on("disconnecting", (reason) => {
    console.log(socket.id);
    // for (const room of socket.rooms) {
    //   if (room !== socket.id) {
    //     let roomUsers = roomsVsUsers[room];
    //     roomUsers = roomUsers.filter((each) => each.socket_id !== socket.id);
    //     roomsVsUsers[room] = roomUsers;
    //     io.to(room).emit("new-users", roomUsers);
    //   }
    // }
  });
  socket.on("GAME_END", async (args) => {
    await userEndGame(args);
  });
});

setInterval(async()=>{
    const result = await fetchDataForRoom()
    console.log(result)
    for (let room in rooms){
        let roomWinners = result[room]
        if(roomWinners){
            io.to(rooms[room]).emit('winners-user',JSON.parse(roomWinners))
        }
    }
    
},10000)


connectToRedis().then(() => {
  server.listen(8000, () => {
    console.log("listening on *:8000");
  });
});
