// RUN: node index.js

const express = require("express");
const { WebSocketServer } = require("ws");
const path = require("path");

const webserver = express();

webserver.use(express.static(path.join(__dirname, "public")));

webserver.listen(3000, "192.168.1.235", () =>
  console.log(`Listening on ${3000}`)
);
//.listen(3000, () => console.log(`Listening on ${3000}`));

const sockserver = new WebSocketServer({ port: 8080 });
clients = [];

sockserver.on("connection", (ws) => {
  ws.id = Math.floor(Math.random() * 10000);
  clients.push(ws.id);
  console.log("New client connected, ID:", ws.id);

  ws.send(JSON.stringify({ type: "id", id: ws.id }));

  console.log(clients);

  ws.on("close", () => {
    console.log("Client has disconnected, ID:", ws.id);
    clients.pop(ws.id);
    console.log(clients);
  });

  let sender;

  ws.on("message", (data) => {
    sender = ws;

    sockserver.clients.forEach((client) => {
      if (client !== sender) {
        console.log(`Distributing message: ${data}`);
        client.send(`${data}`);
      }
    });
  });

  ws.onerror = function () {
    console.log("websocket error");
  };
});
