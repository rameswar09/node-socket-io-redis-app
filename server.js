require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const {
  connectToRedis,
  fetchDataForRoom,
  createUser,
  userEndGame,
} = require("./redis-db");
const { rooms, levelVsKeys } = require("./constans");

// socket config
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const lobbyVsUsers = {};

app.get("/", async (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {

    // new user onboarding to the game
  socket.on("join-room", async (args) => {
    const lobby = args[0].level;
    socket.join(lobby); // joining in a room
    await createUser(args[0]); // creating new user

    let existingUsersInLobby = lobbyVsUsers[lobby] ? lobbyVsUsers[lobby] : [];
    existingUsersInLobby.push({ ...args[0], socket_id: args[1] });
    lobbyVsUsers[lobby] = existingUsersInLobby;
    console.log(lobbyVsUsers);

    // sending data to lobby users
    for (let lobby in lobbyVsUsers) {
      io.to(lobby).emit("new-users", lobbyVsUsers[lobby]);
    }
  });

  // removing user from the lobby
  socket.on("disconnecting", (reason) => {
    console.log(socket.id);
    for (const lobby of socket.rooms) {
      if (lobby !== socket.id) {
        let lobbyUsers = lobbyVsUsers[lobby];
        lobbyUsers = lobbyUsers.filter((each) => each.socket_id !== socket.id);
        lobbyVsUsers[lobby] = lobbyUsers;
        io.to(lobby).emit("new-users", lobbyUsers);
      }
    }
  });

  // update the details when user ends the game
  socket.on("GAME_END", async (args) => {
    await userEndGame(args);
  });

});

// keep fetching the recent winners details
setInterval(async () => {
  const allWinners = await fetchDataForRoom();
  console.log(allWinners);
  for (let lobby in rooms) {
    let lobbyWinners = allWinners[lobby];
    if (lobbyWinners) {
      io.to(rooms[lobby]).emit("TICKER_DATA", JSON.parse(lobbyWinners));
    }
  }
}, 10000);


// websocket connection 
connectToRedis().then(() => {
  server.listen(8000, () => {
    console.log("listening on *:8000");
  });
});
