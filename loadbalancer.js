var http = require('http');
var proxy = require('http-proxy');
var request = require('request');

//http.globalAgent.maxSockets = 10240;

console.log(http.globalAgent);

var servers = [
  {host: '127.0.0.1', port: 3000},
  {host: '127.0.0.1', port: 3002}
];
 
 var failoverTimer = [];

 var proxies = servers.map(function (target) {
	  return new proxy.createProxyServer({ target: target });
	});

 /**
 * Select a random server to proxy to. If a 'server' cookie is set, use that
 * as the sticky session so the user stays on the same server (good for ws fallbacks).
 * @param  {Object} req HTTP request data
 * @param  {Object} res HTTP response
 * @return {Number}     Index of the proxy to use.
 */
var selectServer = function(req, res) {
  var index = -1;
  var i = 0;
 
  // Check if there are any cookies.
  if (req.headers && req.headers.cookie && req.headers.cookie.length > 1) {
    var cookies = req.headers.cookie.split('; ');
 
    for (i=0; i<cookies.length; i++) {
      if (cookies[i].indexOf('server=') === 0) {
        var value = cookies[i].substring(7, cookies[i].length);
        if (value && value !== '') {
          index = value;
          break;
        }
      }
    }
  }
 
  // Select a random server if they don't have a sticky session.
  if (index < 0 || !proxies[index]) {
    index = Math.floor(Math.random() * proxies.length);
  }
 
  // If the selected server is down, select one that isn't down.
  if (proxies[index].options.down) {
    index = -1;
 
    var tries = 0;
    while (tries < 5 && index < 0) {
      var randIndex = Math.floor(Math.random() * proxies.length);
      if (!proxies[randIndex].options.down) {
        index = randIndex;
      }
 
      tries++;
    }
  }
 
  index = index >= 0 ? index : 0;
 
  // Store the server index as a sticky session.
  if (res) {
    res.setHeader('Set-Cookie', 'server=' + index + '; path=/');
  }
 
  return index;
};
 var startFailoverTimer = function(index) {
  if (failoverTimer[index]) {
    return;
  }
 
  failoverTimer[index] = setTimeout(function() {
    // Check if the server is up or not
    request({
      url: 'http://' + proxies[index].options.target.host + ':' + proxies[index].options.target.port,
      method: 'HEAD',
      timeout: 10000
    }, function(err, res, body) {
      failoverTimer[index] = null;
 
      if (res && res.statusCode === 200) {
        proxies[index].options.down = false;
        console.log('Server #' + proxies[index].options.target.host + ':' + proxies[index].options.target.port + ' is back up.');
      } else {
        proxies[index].options.down = true;
        startFailoverTimer(index);
        console.log('Server #' + proxies[index].options.target.host + ':' + proxies[index].options.target.port + ' is still down.');
      }
    });
  }, 1000);
};

// Select the next server and send the http request.
var serverCallback = function(req, res) {
  var proxyIndex = selectServer(req, res);
  var proxy = proxies[proxyIndex];
  proxy.web(req, res);
 
  proxy.on('error', function(err) {
    startFailoverTimer(proxyIndex);
  });
};
var server = http.createServer(serverCallback);
 
// Get the next server and send the upgrade request.
server.on('upgrade', function(req, socket, head) {
  var proxyIndex = selectServer(req);
  var proxy = proxies[proxyIndex];
  proxy.ws(req, socket, head);
 
  proxy.on('error', function(err, req, socket) {
    socket.end();
    startFailoverTimer(proxyIndex);
  });
});
 
server.listen(8080);