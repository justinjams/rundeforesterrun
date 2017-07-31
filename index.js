const express = require('express');
const app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
 res.sendFile('index.html', { root: __dirname});
});

app.listen(3000, function () {
  console.log('We online');
});

var livereload = require('livereload');
var server = livereload.createServer();
server.watch(__dirname + "/public");
