const { createClient, commandOptions } = require("redis");
let client;
const levelVsKeys = {
  beginner: "beginner:room",
  advanced: "advanced:room",
  intermediate: "intermediate:room",
};
const connectToRedis = async () => {
  client = await createClient({
    url: process.env.REDIS_URL,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();
};

const test = async () => {
  await client.set("name", "ram1");
  const value = await client.get("name");
  console.log(value);
  // await client.disconnect();
};
const streamRead = async (key, result) => {
  let response = await client.xRead(
    commandOptions({
      isolated: true,
    }),
    [
      {
        key: key,
        id: "0-0",
      },
    ],
    {
      COUNT: 10,
    }
  );
  console.log(response ? JSON.stringify(response) : null);
  result[key] = response ? JSON.stringify(response) : null;
  return 
};
const streamPush = async (args) => {
  try {
    const userKeyStatus = `${args.name}:${args.userId}:status`;
    const res = await client.get(userKeyStatus);
    if (res !== "end-game") {
      let key = levelVsKeys[args.level];
      await client.xAdd(key, "*", args);
    }
  } catch (err) {
    console.log(err);
  }
};
const createUser = async (userDetails) => {
  try {
    const userKey = `${userDetails.name}:${userDetails.userId}`;
    await client.hSet(userKey, userDetails);
  } catch (err) {
    console.log(err);
  }
};

const userEndGame = async (userData) => {
  try {
    console.log(userData);
    const userKey = `${userData.name}:${userData.userId}:endTotal`;
    const userKeyStatus = `${userData.name}:${userData.userId}:status`;
    await client.hSet(userKey, userData);
    await streamPush(userData);
    await client.set(userKeyStatus, "end-game");
  } catch (err) {
    console.log(err);
  }
};
const fetchDataForRoom = async () => {
  let arr = [];
  let result = {}

  for (let i of Object.values(levelVsKeys)) {
    arr.push(streamRead(i, result));
  }
  await Promise.allSettled(arr);
  console.log(result)
  return result;
};
module.exports = {
  connectToRedis,
  test,
  streamPush,
  createUser,
  userEndGame,
  fetchDataForRoom,
};
