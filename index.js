//accepts https traffic and terminates SSL before //passing requests to backend servers
const fs = require('fs');
const https = require('https');
const proxyRouter = require('./routes/proxy');
app.use('/app', proxyRouter);//req to /app will be proxied to backend
const options = {
  key: fs.readFileSync('./ssl/key.pem');
  cert: fs.readFileSync('./ssl/cert.pem');
};

https.createServer(options, app).listen(443, () => {
  console.log('Load Balancer Started on port 443');
});
//openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
//This will generate key.pem and cert.pem files that our HTTPS server can use.
