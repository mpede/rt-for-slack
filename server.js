#!/bin/env node

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var http = require('http');
var inspect = require('eyes').inspector({  maxLength:null, stream:null });

http.createServer(function (req, res) {

    var incoming='';

    req.on('data', function(d){
        incoming+=d;
    })
    req.on('end',function(){
        res.writeHead(200, {'Content-Type': 'text/plain'});    
        res.write('\nBOM\n'+incoming);
        res.write(inspect(QueryStringToJSON(incoming)).replace(/\[[\d]{1,2}m/g,''));
        res.end('\nEOM\n(played back to you by NodeJS ;-)');
    })

}).listen(port, ipaddress);
console.log('Server running at '+ipaddress+':'+port);


function QueryStringToJSON(qs) {            
    var pairs = qs.slice(1).split('&');    
    var result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1] || '');
    });
    return JSON.parse(JSON.stringify(result));
}