const express = require('express');
const app = express();
app.get('/app', (req, res) => {
  res.send(`Hello from server! Host: ${process.env.HOSTNAME}`);
});
app.listen(3000, () => {
  console.log('Backend Server Running on port 3000');
});
