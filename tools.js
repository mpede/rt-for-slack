

module.exports={
	
	QueryStringToJSON: function(qs) {            
	    var pairs = qs.split('&'), result = {};
	    pairs.forEach(function(pair) {
	        pair = pair.split('=');
	        result[pair[0]] = decodeURIComponent(pair[1]||'');
	    });
	    return JSON.parse(JSON.stringify(result))
	}

}

