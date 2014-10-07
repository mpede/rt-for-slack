#!/bin/env node

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var http = require('http');
var request = require('request');
var inspect = require('eyes').inspector({  maxLength:null, stream:null });

http.createServer(function (req, res) {

    var incoming='';

    req.on('data', function(d){
        incoming+=d;
    })
    req.on('end',function(){
        incoming=QueryStringToJSON(incoming);
        res.writeHead(200, {'Content-Type': 'text/plain'});    
        //res.write('\nBOM\n'+incoming+'\n');
        //res.write(inspect(incoming).replace(/\[[\d]{1,2}m/g,''));
        //res.write('\n');
        request.get('http://api.rottentomatoes.com/api/public/v1.0/movies.json?q='+incoming.text+'&page_limit=1&page=1&apikey=***REMOVED***',function(e,r){
                res.write(inspect(JSON.parse(r.body)).replace(/\[[\d]{1,2}m/g,''));
                res.end('\n\n(brought to you by OpenShift, NodeJS and Wogan ..oO..)');
        });
    })

}).listen(port, ipaddress);
console.log('Server running at '+ipaddress+':'+port);


function QueryStringToJSON(qs) {            
    var pairs = qs.split('&');    
    var result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1] || '');
    });
    return JSON.parse(JSON.stringify(result))
}