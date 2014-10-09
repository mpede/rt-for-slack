#!/bin/env node

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var http = require('http');
var async= require('async');
var request = require('request');
var inspect = require('eyes').inspector({  maxLength:null, stream:null });

http.createServer(function (req, res) {
    var data={}; 
    data.incoming="";
    req.on('data', function(d){  data.incoming+=d; })
    req.on('end',function(){    
        async.series([
            function(next){
                if (data.incoming=="") next(1);
                data.inc=QueryStringToJSON(data.incoming);
                res.writeHead(200, {'Content-Type': 'text/plain'});
                request.get('http://api.rottentomatoes.com/api/public/v1.0/movies.json?q='+data.inc.text+
                    '&page_limit=1&page=1&apikey=***REMOVED***',function(e,r){
                    e&&(data.error=!0,data.errmsg='Error searching movies!');
                    if(r){
                        data.search=JSON.parse(r.body);
                        if (data.search.total&&data.search.total>0) {
                            data.error=!1;
                        } else {
                            data.error=!0;
                            data.errmsg='No movies found!';
                        }
                    } 
                    next();
                });
            },
            function(next){
                data.out={}; 
                if (!data.error)
                request.get('http://api.rottentomatoes.com/api/public/v1.0/movies/'+data.search.movies[0].id+
                    '.json?apikey=***REMOVED***',function(e,r){
                    e&&(data.error=!0,data.errmsg='Error retrieving movie details!');
                    if(r){
                        data.movie=JSON.parse(r.body);
                        data.out.channel='#'+data.inc.channel_name;
                        data.out.username=data.movie.title;
                        data.out.text=data.movie.year+'';
                        data.movie.genre&&(data.out.text+=', ',data.movie.genre.forEach(function(g){data.out.text+=g+' '}));
                        data.movie.runtime&&(data.out.text+=',     '+data.movie.runtime+' minutes');
                        data.out.text+='\n';
                        data.out.text+='Critics Score: '
                        data.movie.ratings||(data.movie.ratings={});
                        if (!data.movie.ratings.critics_score||data.movie.ratings.critics_score==-1)
                            data.out.text+='n/a';
                        else
                            data.out.text+=data.movie.ratings.critics_score+'%';
                        data.out.text+=',       Audience Score: '
                        if (!data.movie.ratings.audience_score||data.movie.ratings.audience_score==-1)
                            data.out.text+='n/a';
                        else
                            data.out.text+=data.movie.ratings.audience_score+'%';
                        data.out.text+='\n';
                        data.out.text+='Director(abr.): ';
                        data.movie.abridged_directors&&(data.movie.abridged_directors.forEach(function(d){data.out.text+=d.name+' '}));
                        data.movie.studio&&(data.out.text+='        Studio: '+data.movie.studio);
                        data.out.text+='\n';
                        data.out.text+='Cast(abr.): ';
                        data.movie.abridged_cast&&(data.movie.abridged_cast.forEach(function(c){data.out.text+=c.name+' as '+c.characters[0]+', '}));
                        data.out.text=data.out.text.slice(0,-2)+'\n\n';
                        data.movie.synopsis&&(data.out.text+=data.movie.synopsis);
                        data.out.text+='\n\nFor more view the <'+data.movie.links.alternate+'|Full RT page>';
                        data.movie.alternate_ids&&data.movie.alternate_ids.imdb
                            &&(data.out.text+=' or go to <http://www.imdb.com/title/tt'+data.movie.alternate_ids.imdb+'|this title on IMDB>');
                    } 
                    next();                 
                });
                else next();
            },
            function(next){
                data.error&&(data.out.text=data.errmsg,data.out.channel='#'+data.inc.channel_name,data.out.username='Error');
                data.out.text+='\n\n'+data.inc.command+' '+data.inc.text.split('+').join(' ');
                request.post('https://aem.slack.com/services/hooks/incoming-webhook?token=***REMOVED***',{ json: data.out },
                    function(e,r){ 
                        next();
                    });
            }
            ], function(e) {
                //e||(res.end(inspect(data.out).replace(/\[[\d]{1,2}m/g,"")));
                e&&(res.write('no POST'));
                res.end('');   
            });
    })
}).listen(port, ipaddress);     // res.end('\n\n(brought to you by RT API, OpenShift, NodeJS and Wogan ..oO..)');   
console.log('Server running at '+ipaddress+':'+port);

function QueryStringToJSON(qs) {            
    var pairs = qs.split('&'), result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1] || '');
    });
    return JSON.parse(JSON.stringify(result))
}