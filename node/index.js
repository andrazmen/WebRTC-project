const express = require("express");
const webserver = express()
  .use((req, res) =>
    res.sendFile("/websocket-client-rtc.html", { root: __dirname })
  )
  .listen(3000, () => console.log(`Listening on ${3000}`));

const { WebSocketServer } = require("ws");
const sockserver = new WebSocketServer({ port: 443 });

sockserver.on("connection", (ws) => {
  console.log("New client connected!");
  //ws.send("connection established");

  ws.on("close", () => console.log("Client has disconnected!"));
  /*
  ws.on("message", (data) => {
    sockserver.clients.forEach((client) => {
      console.log(`distributing message: ${data}`);
      client.send(`${data}`);
      //client.send(JSON.parse(data));
    });
  });
  */
  let sender;

  ws.on("message", (data) => {
    // Save the sender WebSocket connection
    sender = ws;

    // Distribute the message to all clients except the sender
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
