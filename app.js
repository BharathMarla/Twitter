const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();

app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");
let database = null;

const initializeDBandServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at : http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error : ${error.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

app.get("/usertable/", async (require, response) => {
  const getuserTable = `
    SELECT * FROM user;`;
  const data = await database.all(getuserTable);
  response.send(data);
});
app.get("/followertable/", async (require, response) => {
  const getfollowerTable = `
    SELECT * FROM follower;`;
  const data = await database.all(getfollowerTable);
  response.send(data);
});
app.get("/tweettable/", async (require, response) => {
  const gettweetTable = `
    SELECT * FROM tweet;`;
  const data = await database.all(gettweetTable);
  response.send(data);
});
app.get("/replytable/", async (require, response) => {
  const getreplyTable = `
    SELECT * FROM reply;`;
  const data = await database.all(getreplyTable);
  response.send(data);
});
app.get("/liketable/", async (require, response) => {
  const getlikeTable = `
    SELECT * FROM like;`;
  const data = await database.all(getlikeTable);
  response.send(data);
});

function authenticationToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
   SELECT *
   FROM user
   WHERE username = "${username}";`;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length > 5) {
      const createUserQuery = `
        INSERT INTO 
        user (name, username, password, gender)
        VALUES ('${name}', '${username}', '${hashedPassword}', '${gender}')
        `;
      const data = await database.run(createUserQuery);
      response.send(`User created successfully`);
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
  SELECT *
  FROM user
  WHERE username = "${username}";`;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get(
  "/user/tweets/feed/",
  authenticationToken,
  async (request, response) => {
    const getUserTweetFeed = `
    SELECT user.username, tweet.tweet, tweet.date_time as dateTime
    FROM user JOIN follower INNER JOIN tweet ON follower.following_user_id=tweet.user_id
    ORDER BY tweet.date_time DESC
    LIMIT 4
    OFFSET 0`;

    const data = await database.all(getUserTweetFeed);
    response.send(data);
  }
);

module.exports = app;
