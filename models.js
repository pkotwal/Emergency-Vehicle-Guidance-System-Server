var mongoose = require('mongoose');
//mongoose.Promise = require('bluebird');

mongoose.connect('mongodb://pratik:popo1234@ds111589.mlab.com:11589/evgs',{
  server: {
    socketOptions: {
      socketTimeoutMS: 0,
      connectionTimeout: 0
    }
  }
});

var userSchema = new mongoose.Schema({
	name: String,
	vehicle_registration: String,
	vehicle_type: String,
    fcm_id: String,
    onDuty: Boolean,
	location:{
		latitude:Number,
		longitude: Number,
        bearing: Number,
        last_updated: Number
	}
});

var signalSchema = new mongoose.Schema({
	signalGroup: Number,
	status: Number,
	premptedBy: String,
	location:{
		latitude:Number,
		longitude: Number,
	},
    activationDirection:{
        Xaxis:Number,
        Yaxis:Number
    }
});

mongoose.model('User', userSchema);
mongoose.model('Signal', signalSchema);