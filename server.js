var http = require('http');
var https = require('https');
const { URL, URLSearchParams } = require('url');
var email = require("emailjs");
var email_addr = "";

// TODO: Fix this send email function.
function send_email(email_addr, title, code) {
	var server = email.server.connect({
	   user:    "cabsavior@gmail.com", 
	   password: process.env.PASSWORD, 
	   host:    "smtp.gmail.com", 
	   ssl:     true
	});

	// send the message and get a callback with an error or details of the message that was sent
	server.send({
	   text:    code + ": " + title + " has a new opening! Check the chrome extension or CAB for details", 
	   from:    "CAB Savior <cabsavior@gmail.com>", 
	   to:      email_addr,
	   subject: "A space has has opened up in" + code + "!"
	}, function(err, message) { console.log(err || message); });
}

// Gets term code for current time.
function get_term_code() {
	var code = "";
	var time = new Date();
	// Months are zero indexed hahaha
	if (time.getMonth() >= 9 || time.getMonth() < 3) {
		code = (time.getFullYear()-1).toString() + "20";
	} else {
		code = time.getFullYear().toString() + "10";
	}
	return code;
}

// Sets up the node server.
var server = http.createServer(function(req, res) {
	// Gets parameters from url and checks if there is one for course code.
	var code = "";
	var params = new URLSearchParams(req.url.substr(2));
	var emailSupplied = "";
	// Iterates to search for course_code.
	for (const [name, value] of params) {
	  if(name == "course_code") {
	  	code = value;
	  	// Adds a space if one is not inserted (assumes no course code numbers begin with letters).
	  	if(code.indexOf(" ") == -1) {
	  		for(var i = 0; i < code.length; i++) {
	  			// Searches up to first numeric character.
	  			if(!isNaN(parseInt(code[i]))) {
  					code = code.substr(0, i) + " " + code.substr(i);
  					// Converts "cs" to "csci".
  					if(code.substr(0,i) == "cs") {
  						code = "csci" + code.substr(2);
  					}
	  				break;
	  			}
	  		}
	  	}
	  } else if(name == "email") {
	  	emailSupplied = value;
	  }
	}

	// The JSON data returned by the server.
	var returnData = {};

	// Error if no course code.
	if(code == "") {
		res.writeHead(400);
		returnData['error'] = "Course code not supplied";
		res.end(JSON.stringify(returnData));
	} else {
		// Gets data from that course code!
		https.get('https://cab.brown.edu/asoc-api/?output=json&page=asoc.rjs&route=course&term=' + get_term_code() + '&course=' + code, (resp) => {
			let data = '';

			// A chunk of data has been recieved.
			resp.on('data', (chunk) => {
			data += chunk;
			});

			// The whole response has been received.
			resp.on('end', () => {
				// These lines allow Cross-Origin Resource Sharing (CORS).
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Request-Method', '*');
				res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
				res.setHeader('Access-Control-Allow-Headers', '*');
				// Success.
				res.writeHead(200);
				var parsed = JSON.parse(data);
				// Checks if API returned error.
				if(parsed['error'] != null) {
					returnData['error'] = "Course not found";
				} else {
					if(emailSupplied != "") {
						send_email(emailSupplied, parsed.course.title, parsed.course.code);
						return true;
					}
					// Adds basic course data to the JSON object.
					returnData['title'] = parsed.course.title;
					returnData['code'] = parsed.course.code;
					returnData['sections'] = [];
					returnData['overrideRequired'] = parsed.course.warns.includes('permission');
					// Adds each section if it isn't cancelled.
					parsed.sections.forEach(function(section, i){
						if(!section.cncld) {
							returnData['sections'][i] = {};
							returnData['sections'][i]['no'] = section.no;
							returnData['sections'][i]['capacity'] = section.capacity;
							returnData['sections'][i]['avail'] = section.avail;
							returnData['sections'][i]['meet'] = section.meet;
						}
					});
				}
				res.end(JSON.stringify(returnData));
			});

		}).on("error", (err) => {
		  console.log("Error: " + err.message);
		});
	}
});

server.listen(process.env.PORT || 8080);