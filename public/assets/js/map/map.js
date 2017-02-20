$(function(){

  var getUrlParameter = function getUrlParameter(sParam) {
      var sPageURL = decodeURIComponent(window.location.search.substring(1)),
          sURLVariables = sPageURL.split('&'),
          sParameterName,
          i;

      for (i = 0; i < sURLVariables.length; i++) {
          sParameterName = sURLVariables[i].split('=');

          if (sParameterName[0] === sParam) {
              return sParameterName[1] === undefined ? true : sParameterName[1];
          }
      }
  };

  var set_height= function setHeight(){
     var height = getUrlParameter('height');
     //If no height full screen
      if(!height)
      height=$(window).height();
    $('div#map').css("height", height);
  };

    $( window ).resize(function() {
    set_height();
  });

  set_height();

  var tiles = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiamF2aWVyY2FycmlsbG8iLCJhIjoiY2l5eWV3ejVuMDAwbjJxbnBsZGtzYnl3MyJ9.zjdpq2iM92b7Fc5JCSXfsw', {
      maxZoom: 9,
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    id: 'mapbox.streets'
    }),
    latlng = L.latLng(50.06, 14.32);

  var map = L.map('map', {center: latlng, zoom: 3, layers: [tiles]});

  map.scrollWheelZoom.disable();

  var markers = L.markerClusterGroup();

  var url="https://roadbook.ideacamp2017.eu/api/v2/projects";

  $.getJSON(url, function(data) {
    for(i in data) {
      project = data[i];
      if(project.location){
        var location_content="";
        if(project.location.city)
          location_content+=project.location.city+", ";
        location_content+=project.location.country;

        coordinates=project.location.coordinates;
        image_url="https://roadbook.ideacamp2017.eu/"+project.cover+"?dim=100x0";

        var marker = L.marker(new L.LatLng(coordinates[1],coordinates[0]), { title: project.title });

        marker.bindPopup("<div><img width='100' src="+image_url+"></div><b>Project: </b>"+project.title+"<br /><b>Author: </b>"+project.leader.name+"<br /><b>Location: </b>"+location_content);
        markers.addLayer(marker);
      }

    }

  });

  map.addLayer(markers);

});