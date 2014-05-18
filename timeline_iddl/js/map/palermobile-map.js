/**
 * @author "Massimiliano Leone - maximilianus@gmail.com"
 */
function PalerMobileMap(mapcanvasDiv) {
	
	var map;	// Google map object
	var currentMarker;
	this._mapcanvasDiv = mapcanvasDiv;
	this.init = mapInit;
	this.setMarker = setMarker;

// Initialize and display a google map
	function mapInit() {
		// Create a Google coordinate object for where to initially center the map
		var latlng = new google.maps.LatLng( 38.115702,13.361281 );	// Palermo
		
		// Map options for how to display the Google map
		var mapOptions = { zoom: 11, center: latlng  };
		
		// Show the Google map in the div with the attribute id 'map-canvas'.
		map = new google.maps.Map(document.getElementById(this._mapcanvasDiv), mapOptions);
	};
	function setMarker(latlng, title, address, phone, tipiSpecifici, web) {
		clearMarker();
		var marker = new google.maps.Marker({
			position: latlng,
			map: map
//			,title: title
		});
		currentMarker = marker;
		// Create an InfoWindow for the marker
		var contentString = 
			"<div class='infowindow'>"
				+ "<div class='infowindow_title'>"
					+ "<b>"+title+"</b>"
				+ "</div>"
				+ "<div class='infowindow_content'" // start content
					+ "<div>"+"<i>"+tipiSpecifici+"</i></div>"
					+ "<div>"+address+"</div>"
					+ "<div>"+phone+"</div>";
		var web = checkField(web);
		contentString += "<div><a href="+web+">"+web+"</a></web>";
		contentString += "</div>" // end content
			+"</div>"; // HTML text to display in the InfoWindow
		var infowindow = new google.maps.InfoWindow({ content: contentString });
		
		// Set event to display the InfoWindow anchored to the marker when the marker is clicked.
		google.maps.event.addListener( marker, 'click', function() { infowindow.open( map, marker ); });
		
		map.setZoom( 12 );
		map.setCenter(latlng);
	}
	function clearMarker() {
		if (currentMarker!=null)
			currentMarker.setMap(null);
	}
}
