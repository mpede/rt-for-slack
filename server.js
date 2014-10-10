#!/bin/env node
// Rotten Tomatoes for Slack. Author: cschmidt@acceleration.biz
var
    http = require('http'),
    async= require('async'),
    request = require('request'),
    //inspect = require('eyes').inspector({maxLength:null, stream:null}),
    credentials = require((process.env.OPENSHIFT_DATA_DIR||'./')+'credentials'),
    QueryStringToJSON= require('./tools').QueryStringToJSON;
    ip = process.env.OPENSHIFT_NODEJS_IP||'127.0.0.1',
    port = process.env.OPENSHIFT_NODEJS_PORT||8080,
    data={};  

http.createServer(function (req, res) { 
    data.incoming="";
    req.on('data', function(d){  data.incoming+=d; })
    req.on('end',function(){    
        async.series([
            function(next){
                if (data.incoming=="") next(1);
                data.inc=QueryStringToJSON(data.incoming);
                request.get('http://api.rottentomatoes.com/api/public/v1.0/movies.json?q='+data.inc.text+
                    '&page_limit=1&page=1&apikey='+credentials.rt_token,function(e,r){
                    e&&(data.error=!0,data.errmsg='Error searching movies!');
                    if(r){
                        data.search=JSON.parse(r.body);
                        data.search.total && 0 < data.search.total ? 
                            data.error = !1 : 
                            (data.error = !0, data.errmsg = "No movies found!");
                    } 
                    next();
                });
            },
            function(next){
                data.out={}; 
                if (!data.error)
                request.get('http://api.rottentomatoes.com/api/public/v1.0/movies/'+data.search.movies[0].id+
                    '.json?apikey='+credentials.rt_token,function(e,r){
                    e&&(data.error=!0,data.errmsg='Error retrieving movie details!');
                    if(r){
                        data.movie=JSON.parse(r.body);
                        data.out.channel='#'+data.inc.channel_name;
                        data.out.username=data.movie.title;
                        data.out.text=data.movie.year+'';
                        data.movie.genres&&(data.out.text+=',    ',data.movie.genres.forEach(function(g){data.out.text+=g+', '}));
                        data.movie.runtime&&(data.out.text+='   '+data.movie.runtime+' minutes');
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
                        data.movie.abridged_cast&&(data.movie.abridged_cast.forEach(function(c){data.out.text+=c.name+(c.characters?' as '+c.characters[0]:'')+', '}));
                        data.out.text=data.out.text.slice(0,-2)+'\n\n';
                        //data.movie.synopsis&&(data.out.text+=data.movie.synopsis);
                        data.out.text+='For more info go to <'+data.movie.links.alternate+'|the full RT page>';
                        data.movie.alternate_ids&&data.movie.alternate_ids.imdb
                            &&(data.out.text+=' or go to <http://www.imdb.com/title/tt'+data.movie.alternate_ids.imdb+'|this title on IMDB>');
                    } 
                    next();                 
                });
                else next();
            },
            function(next){
                data.error&&(data.out.text=data.errmsg,data.out.channel='#'+data.inc.channel_name,data.out.username='Error');
                data.out.text+='\n\n'+data.inc.user_name+': '+data.inc.command+' '+data.inc.text.split('+').join(' ');
                request.post('https://aem.slack.com/services/hooks/incoming-webhook?token='+credentials.slack_token,{ json: data.out },
                    function(e,r){ 
                        next();
                    });
            }
            ], function(e) {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                e&&(res.write('no POST'));
                res.end('');   
            });
    })
}).listen(port, ip);     
console.log('Server running at '+ip+':'+port);

