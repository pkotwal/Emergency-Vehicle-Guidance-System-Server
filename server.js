var express = require('express'),
		app = express(),
		server = require('http').createServer(app),
		port = process.env.PORT || 80,
		io=require('socket.io').listen(server),
        bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/',function(req,res){
	res.sendFile(__dirname + '/control.html');
	console.log("User connected");
});

app.post('/login',function(req,res){
	var name = req.body.name;
	var registration = req.body.registration;
    var type = req.body.type;
	
	console.log("Name: "+name+" Registration:"+registration+" Type:"+type);
    
    res.send("Data Received By Server");
});

app.post('/locationUpdate',function(req,res){
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	io.sockets.emit("user location",{latitude:latitude,longitude:longitude});
	console.log("latitude: "+latitude+" longitude:"+longitude);
    res.send("Location Updated");
    
    
});

server.listen(port);
console.log("Server Started");

io.sockets.on('connection',function(socket){
	console.log("Connected");
	
	setTimeout(function(){
			socket.emit('Change Signal',1);
	},10000);
});

//AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0 Directions API
// mongo: pratik popo1234