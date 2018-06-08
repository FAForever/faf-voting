function httpGet(addr, callback){
	let http = new XMLHttpRequest();
	http.open("GET", addr, true);
	http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	
	http.send();
	
	http.onload = function() {
		callback(http.responseText, http.status);
	}
}