/**
		 *	File 			dbconfig.js
		 * 	@version 		0.0.1
		 * 	@author 		Gaurav Kumar		<gaurav@webileapps.com>
*/	

var mysql      = require('mysql');

//Create the MySQL Pool
var pool = mysql.createPool({
  host     : 'localhost',
  port 	   : '3306',
  user     : 'root',
  password : 'admin',
  database : 'lyfeevolution_dev'
});

module.exports = pool;