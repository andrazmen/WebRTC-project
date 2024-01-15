// RUN: node index.js

const express = require("express");
const { WebSocketServer } = require("ws");
const path = require("path");

const webserver = express();

webserver.use(express.static(path.join(__dirname, "public")));

//webserver.listen(3000, "192.168.204.138", () =>
//  console.log(`Listening on ${3000}`)
//);
webserver.listen(3000, () => console.log(`Listening on ${3000}`));

const sockserver = new WebSocketServer({ port: 8080 });
clients = {};

sockserver.on("connection", (ws) => {
  var userID = Math.floor(Math.random() * 10000);
  clients[userID] = ws;
  console.log("New client connected, ID:", userID);

  ws.send(JSON.stringify({ type: "id", id: userID }));

  console.log(clients);

  ws.on("close", () => {
    console.log("Client has disconnected, ID:", userID);
    delete clients[userID];
    console.log(clients);
  });

  ws.on("message", (data) => {
    var dataJSON = JSON.parse(data);

    var toUserID = dataJSON.toUserID;
    var toUserWs = clients[toUserID];
    if (toUserWs) {
      toUserWs.send(JSON.stringify(dataJSON));
    }
    /*
    sockserver.clients.forEach((client) => {
      if (client !== sender) {
        console.log(`Distributing message: ${data}`);
        client.send(`${data}`);
      }
    });*/
  });

  ws.onerror = function () {
    console.log("Websocket error!");
  };
});
