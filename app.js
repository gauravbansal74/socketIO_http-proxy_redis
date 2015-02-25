// Module dependencies.

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lib = require('./lib/core.js');

var routes = require('./routes/index');
var app = module.exports = express();

app.set('port', process.env.PORT || 3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.use('/', routes.index);

var server = app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io')(server);
var redis = require('socket.io-redis');
io.adapter(redis({ host: '127.0.0.1', port: 6379 }));

io.sockets.on('connection', function(socket) {
  console.log("get the apiKey on connection creation",socket.handshake.query.apiKey);
  socket.on('message', function(data) {
    socket.broadcast.emit('message', data);
  });


  socket.on('subscribe', function(apiKey){
    console.log(apiKey);
    lib.getUserDetail(apiKey, function(err, result){
      if(!err){
        var channel = result['email'];
        socket.join(channel);
      }else{
        console.log(err);
      }
    });

    lib.updateUserStatus(apiKey, 1, function(err, result){
      console.log(err || result.affectedRows);
    });
  });


  socket.on('publish', function(data){

    var user_api_key = data['apiKey'];
    var res_id = data['res_id'];
    var current_req_user_email = " ";
    var current_req_user_name = " ";

    lib.getUserDetail(user_api_key, function(err, userdata){
      if(!err){
        current_req_user_email = userdata['email'];
        current_req_user_name = userdata['name'];
        current_req_user_id = userdata['id'];
        var sendMsg = { resolution_id: data['res_id'], msg : data['data'], name : current_req_user_name};
        lib.saveResolutionUpdate(data['res_id'], current_req_user_name, data['data'], current_req_user_id, function(err_output, output){
            console.log(err_output || output.affectedRows);
          });
        lib.getResulotionMembers(res_id, function(err, usersdata){
          if(!err){
            for (var key in usersdata) { 
              var obj = usersdata[key];
              var userEmail = obj['email'];
              io.to(userEmail).emit('publish', JSON.stringify(sendMsg));
            };
          }else{
            console.log(err);
          }
        });
      }
    });
  });

socket.on('typing', function(data){
    console.log(data);
    lib.getUserDetail(data['apiKey'], function(err, userdata){
      if(!err){
        current_req_user_email = userdata['email'];
        current_req_user_name = userdata['name'];
        current_req_user_id = userdata['id'];
        var sendMsg = current_req_user_name+" is typing...";
        lib.getResulotionMembers(data['res_id'], function(err, usersdata){
          if(!err){
            for (var key in usersdata) { 
              var obj = usersdata[key];
              var userEmail = obj['email'];
              io.to(userEmail).emit('typing', JSON.stringify(sendMsg));
            };
          }else{
            console.log(err);
          }
        });
      }
    });
  });


  socket.on('disconnect',function(){

    var apiKey =  socket.handshake.query.apiKey;
    if(apiKey){
      lib.getUserDetail(apiKey, function(err, result){
        if(!err){
          var channel = result['email'];
          socket.leave(channel);
          console.log("user out from channel");
        }else{
          console.log(err);
        }
      });
      lib.updateUserStatus(apiKey, 0, function(err, result){
        console.log(" user status for >>  ", err || result.affectedRows);
      });
    }
  });

});
