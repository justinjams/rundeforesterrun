const express = require('express');
const app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
 res.sendFile('index.html', { root: __dirname});
});

app.listen(process.env.PORT || 3000, function () {
  console.log('We online');
});

if (process.env.NODE_ENV === 'development') {
	var livereload = require('livereload');
	var server = livereload.createServer();
	server.watch(__dirname + "/public");
}
