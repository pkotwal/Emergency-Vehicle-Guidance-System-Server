var express = require('express'),
    app = express(),
    moment = require('moment'),
    server = require('http').createServer(app),
    port = process.env.PORT || 80,
    io = require('socket.io').listen(server),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    request = require('request'),
    polyline = require('polyline'),
    models = require('./models'),
    fs = require('fs'),
    admin = require("firebase-admin");

var User = mongoose.model('User');
var Signal = mongoose.model('Signal');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: "myapplication-copy",
        clientEmail: "firebase-adminsdk-mv9n8@myapplication-copy.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1DGCQK+oNCexC\nP2th1M/Lmz8H9XuTeMmAQQJqJGT48LQQKC7lzARbj0ov5gLq88owno+fvQWLJLKr\n5UiD6p1ZOfEfdywAyz1UjL66aAFc1nKV0qR58KyqRVKmIqUmDWrm0UwoAvokEl20\nHZaHK7q5QDHWxOcqJUebp2n2r7ateeEWd+DkOLa65B7xTc5DwMJV4JOzYXtZZbFI\nAPacXI2C67Oj4dEXC2LoGYTw0xUW8OTHEMtDIo/cnUW7AALJBY11psqv90/4dwM9\nZMZEdL6X+/Wez4qO6wpNF6vMAoP92yF5mPtqK6/W4+vLGSioqaw27OjIx9WLHF+/\nrekLlFIVAgMBAAECggEAN6MyGZwlNRSTklhC+7GWmg9/c0axT0STR+Kyh0Pf89Ck\nxUJUBzKHNEv4lHeu9d0tiXtwz7oa9gO1FLZFbqSu7jisLOtGjofmtRD7m/VSVeFh\nHUG6Ye7gYQMkvwFulx8QdxZivPkNPgCW4z8kfy2lGEDuD/46u+zw8JimK7UcAnso\n69H7UyQG6EMDManrl+6MazSvhWYloTMSo7rr+7P3l+7ejtqlexW1J6fNAbNJZ3TR\n0eTF6dLs3uJtBbRbcjul2I4aGUg17KMYeTRYheDtogB74XMrmUyOhCPITdUVaVwJ\n7g+WMroRxxO1ZboicV5SDi0QoEvDHt/vpTJs9GFIAQKBgQDvZl5T4FyBnwNyBFxb\npA5tTLhBCnO2jLh1As9V2oGMIkZjAqsZN7Abgi1RYrZrlfw1uroYdLHXr2AoXpIl\nf0gjAGU1Sj4MRcTsFH4Fakcbjbbm8BrJcdKe3InXJMnR3A+IZYPMIkoWeEzFIEVm\nLRgsMGg6/JQWZc0y+mQv3Ft/gQKBgQDBmjMv58BrqTMmyk3dx5T9nMtyaTMu62Cq\nkPuIkqw83crobaR8g/L+n3dNampqA/Pnp25X6j3KThfL2zd/WJkPsuFASsw9R+j8\n65+zwc41bxESHYHlnR5r8HLTqqlGNbUvS8nhnMmYInlMrjBYOZAid005JN6KFPMQ\nb6PkuOEclQKBgQDQTJLgikQTKId36mFt/zXqVimvteduu8w3S4WZnvC/PIdf2M+E\ntpaNqNvDh49P1wXGvjzz0H15PIf/OCITbEcY5VwqXPnV9dLc0wu/rHRIfirZj6rP\nAjGPtjZdMw5DgiUluaZOtLsgB/ZMQsL/n1b8A/Z89I3pWxSLOaB4oFQggQKBgBm/\ndEdOvxySaCckiK6SOJJyI+yXaSM4UqbcmVdUimud47p9un6E3fBXLPqyyGxJEksg\nzWAL2yPotul5wivBkLmxxJtUV01fHvFkNN0nTVF18ANEwV3UQ5N/awYTkGeyBOLB\nZZwHyhfdndxA3lUdcrniu/Z5nM8ochshfd6RZ/7xAoGBAOJNV6W1jVTjJUMN4Wok\nS7ynCR9RP6f+d9V2Ser0pkSLz+XuKXdFzOjMe5uBLhWTIk4TR27Nk2Lc9XeVf84V\ntX6CsERKTAajySvCuUV1JKTi9/VwHhEamMs3DgGtWMhCElV2QQQNqhd0EezP1fJX\njUBETkWAuz8spymP254y5083\n-----END PRIVATE KEY-----\n"
    }),
    databaseURL: "https://myapplication-copy.firebaseio.com"
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/control.html');
    console.log("Control Page requested");
});

app.get('/addSignals', function (req, res) {
    res.sendFile(__dirname + '/addSignals.html');
    console.log("Add Signal Page Requested");
});

app.post('/login', function (req, res) {
    var name = req.body.name;
    var registration = req.body.registration;
    var type = req.body.type;
    var fcm = req.body.fcm;

    console.log("Name: " + name + " Registration:" + registration + " Type:" + type + " Token:" + fcm);

    try {
        var data = fs.readFileSync('registered-vehicles.csv', 'utf8');
        var vehicles = data.split(' ');
        if (vehicles.indexOf(registration) >= 0) {
            User.findOne({
                vehicle_registration: registration
            }, function (err, user) {
                if (err) {
                    res.status(500).send(err);
                }
                if (!user) {
                    var user = new User();
                    user.name = name;
                    user.vehicle_registration = registration;
                    user.vehicle_type = type;
                    user.location.latitude = 0;
                    user.location.longitude = 0;
                    user.location.last_updated = 0;
                    user.location.bearing = 0;
                    user.onDuty = false;
                    user.fcm_id = fcm;
                    user.save(function (err, user) {
                        if (err) {
                            res.status(500).send(err);
                        }
                        io.sockets.emit("Draw User", user);
                        res.send({
                            state: "SUCCESS",
                            user: user,
                            message: "SignUp Successful"
                        });
                    });
                } else {
                    res.send({
                        state: "FAILURE",
                        message: "Vehicle Already Signed In"
                    });
                }
            });
        } else {
            res.send({
                state: "FAILURE",
                message: "Vehicle Not in Registered as Emergency Vehicle"
            });
        }
    } catch (e) {
        console.log('Error:', e.stack);
    }
});

app.post('/signout', function (req, res) {
    var userId = req.body.userId;
    console.log(userId);
    User.remove({
        _id: userId
    }, function (err) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json({
                'status': "SUCCESS"
            });
        }
    });
});

app.post('/directionRequest', function (req, res) {
    var userId = req.body.userId;
    var slat = req.body.slat;
    var slong = req.body.slong;
    var dlat = req.body.dlat;
    var dlong = req.body.dlong;

    console.log("User: " + userId + " Source: " + slat + "," + slong + " Destination: " + dlat + "," + dlong);


    User.update({
        '_id': userId
    }, {
        'onDuty': true
    }, function (err, user) {
        if (err) {
            console.log(err);
        }
        if (user) {
            //            console.log(user);
        }
    });

    request.get(
        'https://maps.googleapis.com/maps/api/directions/json?origin=' + slat + ',' + slong + '&destination=' + dlat + ',' + dlong + '&key=AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0&units=metric',
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //            console.log(body);
                var parsed = JSON.parse(body);
                //            console.log(parsed);
                var status = parsed.status;
                //            console.log(status);
                if (status == 'OK') {
                    var routes = (parsed.routes)[0];
                    var bounds = routes.bounds;

                    var northeast = bounds.northeast;
                    var southwest = bounds.southwest;

                    var signalsPassed = [];
                    var signalsToCheck;
                    Signal.find({
                        'location.latitude': {
                            $gte: southwest.lat
                        },
                        'location.longitude': {
                            $gte: southwest.lng
                        },
                        'location.latitude': {
                            $lte: northeast.lat
                        },
                        'location.longitude': {
                            $lte: northeast.lng
                        }
                    }, function (err, signals) {
                        if (err) {
                            res.status(500).send(err);
                        }
                        if (signals) {
                            //                    console.log(signals);

                            signalsToCheck = signals;
                            var legs = (routes.legs)[0];
                            var steps = legs.steps;

                            steps.forEach(function (step, index) {
                                var poly = step.polyline;
                                var points = poly.points;
                                var decoded = polyline.decode(points);

                                for (var i = 0; i < decoded.length - 1; i++) {
                                    signalsToCheck.forEach(function (signalToCkeck) {
                                        if (signalToCkeck.location.latitude >= Math.min(decoded[i][0], decoded[i + 1][0]) && signalToCkeck.location.latitude <= Math.max(decoded[i][0], decoded[i + 1][0]) && signalToCkeck.location.longitude >= Math.min(decoded[i][1], decoded[i + 1][1]) && signalToCkeck.location.longitude <= Math.max(decoded[i][1], decoded[i + 1][1])) {
                                            //                                    console.log(signalToCkeck+" "+decoded[i][0]+","+decoded[i][1]+" "+decoded[i+1][0]+","+decoded[i+1][1]);
                                            var yDir = Math.abs(decoded[i + 1][0] - decoded[i][0]) / (decoded[i + 1][0] - decoded[i][0]);
                                            var xDir = Math.abs(decoded[i + 1][1] - decoded[i][1]) / (decoded[i + 1][1] - decoded[i][1]);

                                            //                            console.log("X: "+xDir+" Y: "+yDir);
                                            //                            console.log(signalToCkeck.activationDirection.Xaxis + " " + signalToCkeck.activationDirection.Yaxis);
                                            if (!(-1 * xDir == signalToCkeck.activationDirection.Xaxis || -1 * yDir == signalToCkeck.activationDirection.Yaxis)) {
                                                var error = Math.abs(bearing(decoded[i][0], decoded[i + 1][0], decoded[i][1], decoded[i + 1][1]) - bearing(signalToCkeck.location.latitude, decoded[i + 1][0], signalToCkeck.location.longitude, decoded[i + 1][1]));
                                                //                              console.log(error);
                                                if (error < 10) {
                                                    //                                    console.log(signalToCkeck);
                                                    signalsPassed.push(signalToCkeck);
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        } else {
                            console.log("khg");
                        }
                        sendResponse();
                    });

                    function sendResponse() {
                        res.json({
                            'status': "SUCCESS",
                            'signals': signalsPassed,
                            'directions': body
                        });
                    }
                } else {
                    res.json({
                        'status': "FAILURE"
                    });
                }
            }
        });
});

app.post('/locationUpdate', function (req, res) {
    var userId = req.body.user_id;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var bearing = req.body.bearing;

    User.update({
            _id: userId
        }, {
            'location.latitude': latitude,
            'location.longitude': longitude,
            'location.bearing': bearing,
            'location.last_updated': moment.utc().format("x")
        },
        function (err, users) {
            if (err) {
                res.status(500).send(err);
            }
            if (users) {
                io.sockets.emit("user location", {
                    user_id: userId,
                    latitude: latitude,
                    longitude: longitude,
                    bearing: bearing
                });
                //                        console.log("userId: "+userId+" latitude: "+latitude+" longitude:"+longitude+" bearing:"+bearing);
                res.send("Location Updated");
            }
        });
});

app.post('/changeSignal', function (req, res) {
    var userId = req.body.user_id;
    var signalGroupToReset = req.body.signalGroupToReset;
    var signalID = req.body.signalID;
    var signalGroupPrempted = req.body.signalGroupPrempted;

    console.log(userId + " " + signalGroupToReset + " " + signalID + " " + signalGroupPrempted);

    if (signalID != "-1" && signalGroupPrempted != "-1") {
        Signal.update({
                'signalGroup': signalGroupPrempted,
                '_id': {
                    $ne: signalID
                }
            }, {
                'status': -1,
                'premptedBy': userId
            }, {
                multi: true
            },
            function (err, signals) {
                if (err) {
                    res.status(500).send(err);
                }
                if (signals) {
                    Signal.update({
                        '_id': signalID
                    }, {
                        'status': 1,
                        'premptedBy': userId
                    }, function (err, signals2) {
                        if (err) {
                            res.status(500).send(err);
                        }
                        if (signals2) {
                            io.sockets.emit("Signal to Green", {
                                'signalGroup': signalGroupPrempted,
                                'signal': signalID,
                                'premptedBy': userId
                            });
                        }
                    });
                }
            });
    }

    if (signalGroupToReset != "-1") {
        Signal.update({
            'signalGroup': signalGroupToReset
        }, {
            'status': 0,
            'premptedBy': 0
        }, {
            multi: true
        }, function (err, signals) {
            if (err) {
                res.status(500).send(err);
            }
            if (signals) {
                io.sockets.emit("Reset Signals", signalGroupToReset);
            }
        });
    }

    res.send("Signal Changed");
});

app.post('/resetAll', function (req, res) {
    var userId = req.body.user_id;

    Signal.update({
        'premptedBy': userId
    }, {
        'status': 0,
        'premptedBy': 0
    }, {
        multi: true
    }, function (err, signals) {
        if (err) {
            res.status(500).send(err);
        }
        if (signals) {
            //                    console.log("signals");
            io.sockets.emit("Reset Signals By UserId", userId);
        }
    });

    User.update({
        '_id': userId
    }, {
        'onDuty': false
    }, function (err, user) {
        if (err) {
            console.log(err)
        }
        if (user) {
            //            console.log(user);
        }
    });
    res.send("Signal Changed");
});

io.sockets.on('connection', function (socket) {
    console.log("User Connected");
    var allsignals;
    var allusers;

    Signal.find({}, function (err, signals) {
        if (err) {
            res.status(500).send(err);
        }
        if (signals) {
            allsignals = signals;
            findUsers();
        } else {
            console.log("khg");
        }
    });

    function findUsers() {
        User.find({
            'location.last_updated': {
                $ne: 0
            }
        }, function (err, users) {
            if (err) {
                res.status(500).send(err);
            }
            if (users) {
                allusers = users;
                //                console.log(allusers);
                socket.emit('Init Map', {
                    allsignals, allusers
                });
            } else {
                console.log("khg");
            }
        });
    }

    socket.on('Add Signal', function (data) {
        var signalGroup = data.signalGroup;
        var signals = data.signals;
        //        console.log(signals);
        signals.forEach(function (sig) {
            var signal = new Signal();
            signal.signalGroup = signalGroup;
            signal.status = 0;
            signal.premptedBy = 0;
            signal.location.latitude = sig.lat;
            signal.location.longitude = sig.lng;
            signal.activationDirection.Xaxis = sig.xDir;
            signal.activationDirection.Yaxis = sig.yDir;
            signal.save(function (err, signal) {
                if (err) {
                    res.status(500).send(err);
                }
                //                console.log("Signal Added");
                io.sockets.emit("Draw Signal", signal);
            });
        });
    });

    socket.on('DeleteSignal', function (data) {
        console.log(data);
        Signal.remove({
            _id: data
        }, function (err) {
            if (err) {
                res.status(500).send(err);
            } else {
                io.sockets.emit("Remove Signal", data);
            }
        });
    });

    socket.on('Alert Vehicles', function (data) {
        //        console.log(data); 
        var orStatement = [];
        var aDist = 1.0e10,
            pDist = 1.0e10,
            fDist = 1.0e10;
        var a, p, f;
        if (data.vehicles.ambulance == true)
            orStatement.push({
                vehicle_type: 'Ambulance'
            });
        if (data.vehicles.police == true)
            orStatement.push({
                vehicle_type: 'Police Vehicle'
            });
        if (data.vehicles.fire == true)
            orStatement.push({
                vehicle_type: 'Fire Truck'
            });;
        //        console.log(orStatement);
        User.find({
            $or: orStatement,
            onDuty: false
        }, function (err, users) {
            if (err) {
                console.error(err);
            }
            if (users) {
                //            console.log(users);
                users.forEach(function (user, index) {
                    //                console.log(user.location.latitude+","+user.location.longitude);
                    dist = distance(user.location.latitude, data.location.lat, user.location.longitude, data.location.lng);
                    if (user.vehicle_type == 'Ambulance') {
                        if (dist < aDist) {
                            aDist = dist;
                            a = user;
                        }
                    } else if (user.vehicle_type == 'Police Vehicle') {
                        if (dist < pDist) {
                            pDist = dist;
                            p = user;
                        }
                    } else if (user.vehicle_type == 'Fire Truck') {
                        if (dist < fDist) {
                            fDist = dist;
                            f = user;
                        }
                    }
                });
                //                           console.log(a+'\n\n'+p+"\n\n"+f);

                var reg_tokens = [];
                if (a)
                    reg_tokens.push(a.fcm_id);
                if (p)
                    reg_tokens.push(p.fcm_id);
                if (f)
                    reg_tokens.push(f.fcm_id);

                var payload = {
                    data: {
                        latitude: data.location.lat.toString(),
                        longitude: data.location.lng.toString()
                    }
                };

                // Send a message to the device corresponding to the provided
                // registration token.
                if (reg_tokens.length > 0) {
                    admin.messaging().sendToDevice(reg_tokens, payload)
                        .then(function (response) {
                            // See the MessagingDevicesResponse reference documentation for
                            // the contents of response.
                            //                    console.log("Successfully sent message:", response);
                        })
                        .catch(function (error) {
                            console.log("Error sending message:", error);
                        });

                }

            } else {
                console.log("khg");
            }
        });
    });

});

function bearing(lat1, lat2, lon1, lon2) {

    var φ1 = lat1 * (Math.PI / 180);
    var φ2 = lat2 * (Math.PI / 180);
    var λ1 = lon1 * (Math.PI / 180);
    var λ2 = lon2 * (Math.PI / 180);

    var y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    var x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    var brng = Math.atan2(y, x) * (180 / Math.PI);
    return brng;

    console.log(lat1 + "," + lon1 + " " + lat2 + "," + lon2 + " : " + brng);
}

function distance(lat1, lat2, lon1, lon2) {
    var R = 6371e3; // metres
    var φ1 = lat1 * (Math.PI / 180);
    var φ2 = lat2 * (Math.PI / 180);
    var Δφ = (lat2 - lat1) * (Math.PI / 180);
    var Δλ = (lon2 - lon1) * (Math.PI / 180);

    var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = R * c;
    return d;
}

server.listen(port);
console.log("Server Started on port " + port);
//AIzaSyAPevMvwLJvZYzfbbDPDEheI62QpV8QQS0 Directions API
// mongo: pratik popo1234