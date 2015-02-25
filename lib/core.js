/**
		 *	File 			core.js
		 * 	@version 		0.0.1
		 * 	@author 		Gaurav Kumar		<gaurav@webileapps.com>
*/	


var pool = require("./dbconfig.js");

var lib= {};


//get user email using apiKey
lib.getUserEmail = function(apiKey, callback){
	var data;
	pool.getConnection(function(err, connection){
	   connection.query("select email from users inner join devices on  devices.user_id = users.id where devices.api_key='"+apiKey+"'",  function(err, rows){
	    	if(err)	{
		  		callback(err, null);
		  	}else{
		  		callback(null,rows[0]);
		  	}
	    });
		connection.release();
	});	
}

//get user name using email or apiKey
lib.getUserName = function(apiKey, callback){
	var data;
	pool.getConnection(function(err, connection){
	   connection.query("select name from users inner join devices on  devices.user_id = users.id where devices.api_key='"+apiKey+"'",  function(err, rows){
	    	if(err)	{
		  		callback(err, null);
		  	}else{
		  		callback(null,rows[0]);
		  	}
	    });
		connection.release();
	});	
}

lib.getUserDetail = function(apiKey, callback){
	//console.log("user status "+status);
	pool.getConnection(function(err, connection){
	   connection.query("select email, name, users.id from users inner join devices on  devices.user_id = users.id where devices.api_key='"+apiKey+"'",  function(err, rows){
	    	if(err)	{
		  		callback(err, null);
		  	}else{
		  		callback(null,rows[0]);
		  	}
	    });

		connection.release();
	});	
}

lib.updateUserStatus = function(apiKey, status, callback){
	pool.getConnection(function(err, connection){
	   connection.query('UPDATE devices SET connected_to_websocket = ? WHERE api_key = ?', [status, apiKey],  function(err, rows){
	    	if(err)	{
		  		callback(err, null);
		  	}else{
		  		callback(null,rows);
		  	}
	    });
		connection.release();
	});	
}

lib.saveResolutionUpdate = function(resolution_id, source_name, message, user_id, callback){

	var post  = {
			resolution_id: resolution_id, 
			source_name: source_name, 
			message : message, 
			user_id : user_id,
			auto_generated : 0,
			created_at : new Date(),
			updated_at : new Date()
		};

	pool.getConnection(function(err, connection){
	   connection.query('INSERT INTO resolution_updates SET ?', post,  function(err, rows){
	    	if(err)	{
		  		callback(err, null);
		  	}else{
		  		callback(null,rows);
		  	}
	    });
		connection.release();
	});
}

lib.getResulotionMembers = function(resolution_id, callback){
	pool.getConnection(function(err, connection){
	   connection.query("select email,name from users inner join resolution_members on resolution_members.user_id = users.id where resolution_members.resolution_id="+resolution_id,  function(err, rows){
	    	if(err)	{
		  		//throw err;
		  		callback(err, null);
		  	}else{
		  		callback(null,rows);
		  	}
	    });
		connection.release();
	});	
}

module.exports = lib;