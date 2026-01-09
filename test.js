const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Server OK");
});

app.listen(3000, () => {
  console.log("Test server running on 3000");
});
