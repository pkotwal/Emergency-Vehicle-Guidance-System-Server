var express = require('express'),
		app = express(),
		server = require('http').createServer(app),
		port = process.env.PORT || 80,
		io=require('socket.io').listen(server);

app.get('/',function(req,res){
	res.sendFile(__dirname + '/control.html');
	console.log("User connected");
});

server.listen(port);
console.log("Server Started");

io.sockets.on('connection',function(socket){
	console.log("Connected");
	
	setTimeout(function(){
			io.sockets.emit('Change Signal',1);
	},10000);
});

//AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0 Directions API