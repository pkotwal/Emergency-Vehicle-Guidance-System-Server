var express = require('express'),
		app = express(),
        moment = require('moment'),
		server = require('http').createServer(app),
		port = process.env.PORT || 80,
		io=require('socket.io').listen(server),
        mongoose = require('mongoose'),
        bodyParser = require('body-parser'),
        request = require('request'),
        polyline = require('polyline'),
        models = require('./models');

var User = mongoose.model('User');
var Signal = mongoose.model('Signal');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/',function(req,res){
	res.sendFile(__dirname + '/control.html');
	console.log("Control Page requested");
});

app.get('/addSignals',function(req,res){
	res.sendFile(__dirname + '/addSignals.html');
	console.log("Add Signal Page Requested");
});

app.post('/login',function(req,res){
	var name = req.body.name;
	var registration = req.body.registration;
    var type = req.body.type;
	
	console.log("Name: "+name+" Registration:"+registration+" Type:"+type);
    
    User.findOne({vehicle_registration:registration}, function(err, user){
        if(err){res.status(500).send(err);}
        if(!user){
            var user=new User();
            user.name=name;
            user.vehicle_registration = registration;
            user.vehicle_type = type;
            user.location.latitude = 0;
            user.location.longitude = 0;
            user.location.last_updated = 0;
            user.location.bearing = 0;

            user.save(function(err, user) {
               if(err){res.status(500).send(err);}
                res.send({state:"SUCCESS", user: user, message: "SignUp Successful"});
            });
        }else {
            res.send({state:"FAILURE", user: user, message: "Vehicle Already Registered"});
        }
    });
});

app.post('/directionRequest', function(req, res){
    var slat = req.body.slat;
    var slong = req.body.slong;
    var dlat = req.body.dlat;
    var dlong = req.body.dlong;
    
    console.log("Source: "+slat+","+slong+" Destination: "+dlat+","+dlong);
    
    request.get(
    'https://maps.googleapis.com/maps/api/directions/json?origin='+slat+','+slong+'&destination='+dlat+','+dlong+'&key=AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0',
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
//            console.log(body);
            var parsed = JSON.parse(body);
//            console.log(parsed);
            var routes = (parsed.routes)[0];
            var bounds = routes.bounds;
            
            var northeast = bounds.northeast;
            var southwest = bounds.southwest;
            
            var signalsPassed=[];
            var signalsToCheck;
            Signal.find({'location.latitude':{$gte:southwest.lat},'location.longitude':{$gte:southwest.lng},'location.latitude':{$lte:northeast.lat},'location.longitude':{$lte:northeast.lng}},function(err, signals){
                if (err){res.status(500).send(err);}					
                if(signals){               
//                    console.log(signals);
                    signalsToCheck = signals;
                     var legs = (routes.legs)[0];
            var steps = legs.steps;
            steps.forEach(function(step, index){
                var poly = step.polyline;
                var points = poly.points;
                var decoded = polyline.decode(points);
                for(var i = 0; i < decoded.length - 1; i++){
                    signalsToCheck.forEach(function(signalToCkeck){
                        if(signalToCkeck.location.latitude >= Math.min(decoded[i][0],decoded[i+1][0]) && signalToCkeck.location.latitude <= Math.max(decoded[i][0],decoded[i+1][0]) && signalToCkeck.location.longitude >= Math.min(decoded[i][1],decoded[i+1][1]) &&signalToCkeck.location.longitude <= Math.max(decoded[i][1],decoded[i+1][1]) ){
//                            console.log(signalToCkeck+" "+decoded[i][0]+","+decoded[i][1]+" "+decoded[i+1][0]+","+decoded[i+1][1]);
                            var error = Math.abs(bearing(decoded[i][0], decoded[i+1][0], decoded[i][1], decoded[i+1][1]) - bearing(signalToCkeck.location.latitude, decoded[i+1][0], signalToCkeck.location.longitude, decoded[i+1][1])); 
//                            console.log(error);
                            if(error<10){
//                                console.log(signalToCkeck);
                                signalsPassed.push(signalToCkeck);
                            }
                        }                       
                    });
//                    bearing(decoded[i][0], decoded[i+1][0], decoded[i][1], decoded[i+1][1]); 
                }    
            });         
                }else{
                    console.log("khg");
                }
                sendResponse();
            });
            function sendResponse(){
                res.json({'signals':signalsPassed,'directions':body});   
            }
        }
    }
);

});

app.post('/locationUpdate',function(req,res){
    var userId = req.body.user_id;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	var bearing = req.body.bearing;
    
    User.update({_id:userId},
                {'location.latitude':latitude,
                 'location.longitude':longitude,
                 'location.bearing':bearing,
                 'location.last_updated':moment.utc().format("x")},
                function(err,users){		
                    if (err){res.status(500).send(err);}					
                    if(users){           
                        io.sockets.emit("user location",{user_id:userId, latitude:latitude, longitude:longitude, bearing:bearing});	                           
//                        console.log("userId: "+userId+" latitude: "+latitude+" longitude:"+longitude+" bearing:"+bearing);
                        res.send("Location Updated");
                    }
    });
});

app.post('/changeSignal',function(req,res){
    var userId = req.body.user_id;
	var signalID1 = req.body.signalID1;
	var signalID2 = req.body.signalID2;
    
	console.log(userId+" "+signalID1+" "+signalID2);
    
    if(signalID2!="-1")
        io.sockets.emit("Signal to Green",signalID2);
    
    if(signalID1!="-1")
        io.sockets.emit("Reset Signals",signalID1);
    
    res.send("Signal Changed");
});

server.listen(port);
console.log("Server Started");

io.sockets.on('connection',function(socket){
	console.log("Connected");
    
        var allsignals;
    Signal.find({},function(err, signals){
        if (err){res.status(500).send(err);}					
        if(signals){               
            allsignals = signals;
            findUsers();
        }else{
            console.log("khg");
        }
    });
    var allusers;
    function findUsers(){
      User.find({'location.last_updated':{$ne:0}},function(err, users){
        if (err){res.status(500).send(err);}					
        if(users){               
            allusers = users;
//            console.log(allusers);
            socket.emit('Init Map',{allsignals,allusers});
        }else{
            console.log("khg");
        }
    });
   
    }
    
    socket.on('Add Signal',function(data){
        var signalGroup = data.signalGroup;
        var signals = data.signals;
        
        signals.forEach(function(sig){
            var signal = new Signal();
            signal.signalGroup=signalGroup;
            signal.status=0;
            signal.premptedBy=0;
            signal.location.latitude=sig.lat;
            signal.location.longitude=sig.lng;
            signal.activationDirection.Xaxis=0;
            signal.activationDirection.Yaxis=0;
            signal.save(function(err, signal) {
               if(err){res.status(500).send(err);}
//                console.log("Signal Added");
                io.sockets.emit("Draw Signal",signal);
            });
        });
    });
});

function bearing(lat1, lat2, lon1, lon2){

    var φ1 = lat1*(Math.PI/180);
    var φ2 = lat2*(Math.PI/180);
    var λ1 = lon1*(Math.PI/180);
    var λ2 = lon2*(Math.PI/180);

    var y = Math.sin(λ2-λ1) * Math.cos(φ2);
    var x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    var brng = Math.atan2(y, x)*(180/Math.PI);
    return brng;

    console.log(lat1+","+lon1+" "+lat2+","+lon2+" : "+brng);
}

//AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0 Directions API
// mongo: pratik popo1234