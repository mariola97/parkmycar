var map;
var parkingLots = [];
var currentMapBounds;
var currentZoom;
var parkingSpacesMarkersZoomThreshold = 100;
var markers = {};

var marker = '';
let temp = null;
let isHandiccapedTurnedOn = false;
const defaultArrayOfParkingSpacesToShow = [1];
const defaultArrayOfParkingLotsToShow = [1, 2, 3];
const lotsActive = [100];
const lotsDisabled = [100];
var protocol = location.protocol;

  
var icons = {
  Normal: {
      0: {url: `${location.host}normal-free.png`},
      1: {url: `${location.host}normal-occupied.png`}
  }
      
};


var iconSensor = {url: `${location.host}sensor.png`};



$(document).ready(function(){
  initMap();
  // listener for handicap spaces toogle
  $('.filter-checkbox').on('click', function (e) {
    if(e.target.defaultValue == 2 && e.target.checked) {
        setMarkersForActiveLot(6);
        setSidebarForLot(6);
      for(var i = 0; i < parkingLots.length; i++){
        if(markers[parkingLots[i].id]) {
          markers[parkingLots[i].id].setLabel({
            text: String(parkingLots[i].normal_available + parkingLots[i].handicap_available),
            color: '#ffffff',
            fontSize: "18px",
            class: 'test'
          });
        }
      }
    } else if(e.target.defaultValue == 2 && !e.target.checked) {
      deleteMarkers(6);
      deleteSidebarForLot(6);
      for(var i = 0; i < parkingLots.length; i++){
        if(markers[parkingLots[i].id]) {
          markers[parkingLots[i].id].setLabel({
            text: String(parkingLots[i].normal_available),
            color: '#ffffff',
            fontSize: "18px",
            class: 'test'
          });
        }
      }
    } else if(e.target.defaultValue == 3) {
      switch (e.target.checked) {
        case true: {
          setSidebarForLot(4);
          setMarkersForActiveLot(4);
          break;
        }
        case false: {
          deleteSidebarForLot(4);
          deleteMarkers(4);
          break;
        }
      }
    } else if(e.target.defaultValue == 4) {
      switch(e.target.checked) {
        case true: {
          setSidebarForLot(5);
          setMarkersForActiveLot(5);
          break;
        }
        case false: {
          deleteSidebarForLot(5);
          deleteMarkers(5);
        }
      }
    }
  });
});

/**
 * Get parking lots list to show in sidebar and if zoom level is big enough
 */
function updateSidebarSlider(){
  var ne = currentMapBounds.getNorthEast(); // LatLng of the north-east corner
  var sw = currentMapBounds.getSouthWest(); // LatLng of the south-west corner

  $.ajax({
    url: 'http://smart.sum.ba/parking',
    method: 'get',
    dataType: 'json',
    data: {
      neLat: ne.lat(),
      neLng: ne.lng(),
      swLat: sw.lat(),
      swLng: sw.lng(),
      withParkingSpaces: 1
    },
    success: function(response){
      $('#main-sidebar').replaceWith(response.html);
      initSlickParkingLots(markers);
      parkingLots.forEach(parkingLot => {
        if(defaultArrayOfParkingLotsToShow.indexOf(parkingLot.id_type) > -1) {
          $(`#sidebar-parking-lot-${parkingLot.id}`).css('visibility', 'visible');
        }
      })
    }
  });
}
//MAP INIZIALIZATON(FIX ZOOM)
function initMap() {
  var mapDiv = document.getElementById("mapa");

  /* INIT GOOGLE MAP */
  if(mapDiv !== null) {
    currentZoom = 16.5;
    map = new google.maps.Map(document.getElementById("mapa"), {
      center: {lat: 43.345268, lng: 17.796725},
      zoom: currentZoom,
      fullscreenControl: true,
      styles: mapStyle2,
      gestureHandling: 'greedy'
    });

    iconAnchor = {
      origin: new google.maps.Point(0,0)
    };

    // get all parking lots and set markers
    $.ajax({
      url: 'http://smart.sum.ba/parking?withParkingSpaces=1',
      method: 'get',
      data: {
        withParkingSpaces: 1
      },
      success: function(locations) {
        parkingLots = locations;
        setMarkers();
      },
    });

    google.maps.event.addListener(map, 'idle', function() {
      currentMapBounds = this.getBounds();
      updateSidebarSlider();
    });

    google.maps.event.addListener(map, 'zoom_changed', function() {
      var oldZoom = parseInt(currentZoom);
      currentZoom = map.getZoom();
      if(currentZoom > parkingSpacesMarkersZoomThreshold && oldZoom <= parkingSpacesMarkersZoomThreshold) {
        setMarkers();
      } else if(currentZoom <= parkingSpacesMarkersZoomThreshold && oldZoom > parkingSpacesMarkersZoomThreshold){
        setMarkers();
      }
    });
  } else if(document.getElementById("mapDetails")) {
    initMapDetails();
  }
}
//INIT DETAILS(MARKERS)
function initMapDetails() {
  var mapDiv = document.getElementById('mapDetails');
  /* INIT GOOGLE MAP */
  if(mapDiv !== null) {

    // get parking lot and set markers
    $.ajax({
      url: `/parking/${mapDiv.dataset.id}`,
      method: 'get',
      success: function(parkingLot) {
         currentZoom = 19;
        if(mapDiv.dataset.zoom) {
            currentZoom = parseInt(mapDiv.dataset.zoom);
        }

        map = new google.maps.Map(mapDiv, {
          center: {lat: parseFloat(parkingLot.lat), lng: parseFloat(parkingLot.lng)},
          zoom: currentZoom,
          fullscreenControl: true,
          styles: mapStyle2,
          scrollwheel: false,
        });

        parkingLots = [parkingLot];
        setMarkers();
      },
    });
  }
}

function infoWindow (content) {
    return new google.maps.InfoWindow({
        content: content
    });
}

function getMarkerIconAndText(parkingLot) {
    if(parkingLot.id_type !== 6) {
      const numberOfAvailable = isHandiccapedTurnedOn ? parkingLot.normal_available + parkingLot.handicap_available : parkingLot.normal_available;
      let text = String(numberOfAvailable);;
      let icon = {
          labelOrigin: new google.maps.Point(17,20)
      };

      if (!parkingLot.is_active) {
          text = String(' ');
          icon.url = iconParkingLotClosed.url;
      } else if (parkingLot.id_type === 1 ) {
          icon.url = iconSensor.url
          if (!parkingLot.has_sensors || parkingLot.normal_available === null) text = 'P';
          else if (numberOfAvailable === 0) icon.url = iconFull.url;
      } else if (parkingLot.id_type === 2) {
          icon.url = iconRamp.url;
          if (numberOfAvailable === 0) icon.url = iconFull.url
      } else if (parkingLot.id_type === 4) {
          icon.url = iconSupply.url;
      }else {
          icon.url = parkingLot.normal_available + parkingLot.handicap_available > 0 ? iconFree.url : iconOccupied.url;
      }

      return {text: text, icon: icon};
  }else {
    const numberofAvailable = parkingLot.handicap_available;
    let text = String(numberofAvailable);
    let icon = {
        labelOrigin: new google.maps.Point(17,20)
    };

    if (!parkingLot.is_active) {
        text = String(' ');
        icon.url = iconParkingLotClosed.url;
    }else {
        icon.url = parkingLot.handicap_available > 0 ? iconSensor.url : iconFull.url;
    }

    return {text: text, icon: icon};
  }  
}
function setMarkersForActiveLot(Type) {
  for (var i = 0; i < parkingLots.length; i++) {
    if(parkingLots[i].id_type !== Type)
      continue;
      
    //show parking spaces markers for parking lots that have them and zoom level is more then threshold
    if(parkingLots[i].parkingSpaces !== undefined && parkingLots[i].parkingSpaces.length > 0 && currentZoom > parkingSpacesMarkersZoomThreshold) {
      for(var j=0; j<parkingLots[i].parkingSpaces.length; j++) {
        //Define myLatLng, markerIcon
          ((i, j) => {
              const myLatLng = new google.maps.LatLng(parkingLots[i].parkingSpaces[j].lat, parkingLots[i].parkingSpaces[j].lng);
              const markerIcon = Object.assign(icons[parkingLots[i].parkingSpaces[j].type][[parkingLots[i].parkingSpaces[j].occupied ? 1:0]], {});
              const lastChange = parkingLots[i].parkingSpaces[j].occupied === 1 ? moment(parkingLots[i].parkingSpaces[j].updated_at, ["DD.MM.YYYY", moment.ISO_8601]).format('DD.MM.YYYY - HH:mm') : '';
              const marker = new google.maps.Marker({
                  map: map,
                  position: myLatLng,
                  icon: markerIcon,
                  lat: parkingLots[i].parkingSpaces[j].lat,
                  lng: parkingLots[i].parkingSpaces[j].lng,
                  title: `'Parkirno mjesto ${parkingLots[i].parkingSpaces[j].parking_space_name}.\nDatum zadnje promjene: ${lastChange}`,
                  path: new google.maps.Point(50, 65),
                  pid: parkingLots[i].id,
                  parkingIndex: i
              });

              marker.addListener('click', () => {
                  if(temp) {
                      temp.close();
                  }
                  temp = infoWindow(marker.title);
                  temp.open(map ,marker);

                  setTimeout(() => {
                      temp.close();
                  }, 10000);

              });

              markers[`${parkingLots[i].id}_${parkingLots[i].parkingSpaces[j].id}`] = marker;
          })(i, j)
      }

    } else {
      //Define myLatLng, markerIcon
      const myLatLng = new google.maps.LatLng(parkingLots[i].lat, parkingLots[i].lng);
      const markerIconAndText = getMarkerIconAndText(parkingLots[i]);
      marker = new google.maps.Marker({
        map: map,
        position: myLatLng,
        icon: markerIconAndText.icon,
        lat: parkingLots[i].lat,
        lng: parkingLots[i].lng,
        title: `Parking ${parkingLots[i].name}`,
        label: {
          text: markerIconAndText.text,
          color: '#ffffff',
          fontSize: "18px",
        },
        path: new google.maps.Point(50, 65),
        pid: parkingLots[i].id,
        parkingIndex: i,
        draggable: parkingLots[i].normal_available === null ? true : false
      });

      mouseHoverActions(marker);
      markers[parkingLots[i].id] = marker;

    }
    lotsActive.push(Type);
    let indexForDel = lotsDisabled.findIndex(elemnt => {
      return elemnt == Type;
    });
    if(indexForDel > -1)
      lotsDisabled.splice(indexForDel,1);
    defaultArrayOfParkingLotsToShow.push(Type);
  }
}

function setMarkers() {
  setMapOnAll(null);
  for (var i = 0; i < parkingLots.length; i++) {
    if(defaultArrayOfParkingLotsToShow.indexOf(parkingLots[i].id_type)==-1)
      continue;
    //show parking spaces markers for parking lots that have them and zoom level is more then threshold
    if(parkingLots[i].parkingSpaces !== undefined && parkingLots[i].parkingSpaces.length > 0 && currentZoom > parkingSpacesMarkersZoomThreshold) {
      for(var j=0; j<parkingLots[i].parkingSpaces.length; j++) {
        //Define myLatLng, markerIcon
          ((i, j) => {
              const myLatLng = new google.maps.LatLng(parkingLots[i].parkingSpaces[j].lat, parkingLots[i].parkingSpaces[j].lng);
              const markerIcon = Object.assign(icons[parkingLots[i].parkingSpaces[j].type][[parkingLots[i].parkingSpaces[j].occupied ? 1 : 0]], {});
              let theLastEvent;
              if(parkingLots[i].parkingSpaces[j])
                theLastEvent = parkingLots[i].parkingSpaces[j].last_event ? moment(parkingLots[i].parkingSpaces[j].last_event, ["DD.MM.YYYY", moment.ISO_8601]).format('DD.MM.YYYY - HH:mm') : moment(parkingLots[i].parkingSpaces[j].updated_at, ["DD.MM.YYYY", moment.ISO_8601]).format('DD.MM.YYYY - HH:mm');
              else 
                theLastEvent = 'No event';
              const marker = new google.maps.Marker({
                  map: map,
                  position: myLatLng,
                  icon: markerIcon,
                  lat: parkingLots[i].parkingSpaces[j].lat,
                  lng: parkingLots[i].parkingSpaces[j].lng,
                  title: `'Parkirno mjesto ${parkingLots[i].parkingSpaces[j].parking_space_name}.\nDatum zadnje promjene: ${theLastEvent}`,
                  path: new google.maps.Point(50, 65),
                  pid: parkingLots[i].id,
                  parkingIndex: i
              });

              marker.addListener('click', () => {
                  if(temp) {
                      temp.close();
                  }
                  temp = infoWindow(marker.title);
                  temp.open(map ,marker);

                  setTimeout(() => {
                      temp.close();
                  }, 10000);

              });
              markers[`${parkingLots[i].id}_${parkingLots[i].parkingSpaces[j].id}`] = marker;
          })(i, j)
      }

    } else {
      //Define myLatLng, markerIcon
      const myLatLng = new google.maps.LatLng(parkingLots[i].lat, parkingLots[i].lng);
      const markerIconAndText = getMarkerIconAndText(parkingLots[i]);

      marker = new google.maps.Marker({
        map: map,
        position: myLatLng,
        icon: markerIconAndText.icon,
        lat: parkingLots[i].lat,
        lng: parkingLots[i].lng,
        title: `Parking ${parkingLots[i].name}`,
        label: {
          text: markerIconAndText.text,
          color: '#ffffff',
          fontSize: "18px",
        },
        path: new google.maps.Point(50, 65),
        pid: parkingLots[i].id,
        parkingIndex: i,
        draggable: parkingLots[i].normal_available === null ? true : false
      });

      mouseHoverActions(marker);
      markers[parkingLots[i].id] = marker;

    }
  }

}

function mouseHoverActions(marker){
  google.maps.event.addListener(marker, 'click', (function(marker){
    return function() {
      $(".sidebar-parking-lot[data-parking-id='"+marker.pid+"']").trigger('click');
    };
  })(marker));

  google.maps.event.addListener(marker, 'mouseover', (function(marker){
    return function() {
      $(".sidebar-parking-lot[data-parking-id='"+marker.pid+"']").css('background', '#efefef');
    };
  })(marker));

  google.maps.event.addListener(marker, 'mouseout', (function(marker){
    return function() {
      $(".sidebar-parking-lot[data-parking-id='"+marker.pid+"']").css('background', 'transparent');
    };
  })(marker));
}

function setMapOnAll(map) {
  for(var key in markers) {
    if(markers.hasOwnProperty(key)) {
      markers[key].setMap(map);
    }
  }
  markers = [];
}

socket.on('parking-lot-ramp-state-change', data => {
  return handleSocketEventForMap(data);
})
socket.on('parking-lot-state-change', data => {
  return handleSocketEventForMap(data);
})

//SOCKET EVENT HANDLER FOR MAP
function handleSocketEventForMap(data) {
  //FIND PARKING LOT AND IF NOT FOUND EXIT HANDLER
  let parkingLotIndex = parkingLots.findIndex( parkingLot => {
    return parkingLot.id === data.id_parking_lot
  });
  if(parkingLotIndex === -1) return;
  
  //FIND PARKING SPACE IF EVENT IS FROM SENSOR
  let parkingSpaceIndex = -1;
  if (data.id_parking_space && parkingLots[parkingLotIndex].parkingSpaces) {
      parkingSpaceIndex = parkingLots[parkingLotIndex].parkingSpaces.findIndex( parkingSpace => {
          return parkingSpace.id === data.id_parking_space
      });
  }
  
  if(parkingLots[parkingLotIndex].capacity_handicap) {
    parkingLots[parkingLotIndex].handicap_available = data.handicap_available;
    parkingLots[parkingLotIndex].handicap_occupied = data.handicap_occupied;
  }
  parkingLots[parkingLotIndex].normal_available = data.normal_available;
  parkingLots[parkingLotIndex].normal_occupied = data.normal_occupied;

  if(parkingSpaceIndex !== -1) {
    parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].occupied = data.occupied
    parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].updated_at = moment()
  }

  if(parkingLots[parkingLotIndex].parkingSpaces !== undefined && parkingLots[parkingLotIndex].parkingSpaces.length > 0 && currentZoom > parkingSpacesMarkersZoomThreshold && defaultArrayOfParkingLotsToShow.indexOf(parkingLots[parkingLotIndex].id_type) > -1) {
    if(parkingSpaceIndex === -1) 
      return;
    if(markers[`${parkingLots[parkingLotIndex].id}_${parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].id}`]) 
      markers[`${parkingLots[parkingLotIndex].id}_${parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].id}`].setMap(null);

    const myLatLng = new google.maps.LatLng(parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].lat, parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].lng);
    const markerIcon = Object.assign(icons[parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].type][[parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].occupied ? 1 : 0]], {});
    const marker = new google.maps.Marker({
      map: map,
      position: myLatLng,
      icon: markerIcon,
      lat: parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].lat,
      lng: parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].lng,
      title: `'Parkirno mjesto ${parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].parking_space_name}.\nDatum zadnje promjene: ${moment().format('DD.MM.YYYY - HH:mm')}`,
      path: new google.maps.Point(50, 65),
      pid: parkingLots[parkingLotIndex].id,
      parkingIndex: parkingLotIndex
    });
    marker.addListener('click', () => {
      if(temp) {
          temp.close();
      }
      temp = infoWindow(marker.title);
      temp.open(map ,marker);

      setTimeout(() => {
          temp.close();
      }, 10000);

    });
    markers[`${parkingLots[parkingLotIndex].id}_${parkingLots[parkingLotIndex].parkingSpaces[parkingSpaceIndex].id}`] = marker;
  } else if(defaultArrayOfParkingLotsToShow.indexOf(parkingLots[parkingLotIndex].id_type) > -1) {
    const myLatLng = new google.maps.LatLng(parkingLots[parkingLotIndex].lat, parkingLots[parkingLotIndex].lng);

    const iconAndTextForParkingLot = getMarkerIconAndText(parkingLots[parkingLotIndex]);

    if(markers[parkingLots[parkingLotIndex].id]) 
        markers[parkingLots[parkingLotIndex].id].setMap(null);

    const marker = new google.maps.Marker({
        map: map,
        position: myLatLng,
        icon: iconAndTextForParkingLot.icon,
        lat: parkingLots[parkingLotIndex].lat,
        lng: parkingLots[parkingLotIndex].lng,
        title: `Parking ${parkingLots[parkingLotIndex].name}`,
        label: {
            text: iconAndTextForParkingLot.text.toString(),
            color: '#ffffff',
            fontSize: "18px",
        },
        path: new google.maps.Point(50, 65),
        pid: parkingLots[parkingLotIndex].id,
        parkingIndex: parkingLotIndex
    });
    mouseHoverActions(marker);
    markers[parkingLots[parkingLotIndex].id] = marker;
}
  if(document.getElementsByClassName('sidebar-parking-lot'))
    ChangeSidebarState(parkingLots[parkingLotIndex]);
  return;
}

var mapStyle2 = [
  {"featureType":"administrative.land_parcel","elementType":"all","stylers":[{"visibility":"on"}]},
  {"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"on"}]},
  {"featureType":"poi","elementType":"labels","stylers":[{"visibility":"on"}]},
  {"featureType":"road","elementType":"labels","stylers":[{"visibility":"simplified"},{"lightness":20}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"hue":"#f49935"}]},
  {"featureType":"road.highway","elementType":"labels","stylers":[{"visibility":"simplified"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"hue":"#fad959"}]},
  {"featureType":"road.arterial","elementType":"labels","stylers":[{"visibility":"off"}]},
  {"featureType":"road.local","elementType":"geometry","stylers":[{"visibility":"simplified"}]},
  {"featureType":"road.local","elementType":"labels","stylers":[{"visibility":"simplified"}]},
  {"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"all","stylers":[{"hue":"#a1cdfc"}, {"saturation":30},{"lightness":49}]}
];
//UPDATING SIDEBAR FOR MOBILISIS LOTS
function setSidebarForLot(Type) {
    for(let i = 0; i < parkingLots.length; i++) {
      if(parkingLots[i].id_type !== Type)
        continue;
      $(`#sidebar-parking-lot-${parkingLots[i].id}`).css('visibility', 'visible');
    }
  return;
};
function deleteSidebarForLot(Type) {
  for(let i = 0; i < parkingLots.length; i++) {
    if(parkingLots[i].id_type !== Type)
      continue;
    $(`#sidebar-parking-lot-${parkingLots[i].id}`).css('visibility', 'hidden');
  }
return;
}
//DELETE MOBILISIS MARKERS
function deleteMarkers(Type) {
    parkingLots.forEach( parkingLot => {
      if(parkingLot.id_type == Type) {
        markers[parkingLot.id].setMap(null);
      }
    });
    lotsDisabled.push(Type);
    let indexForDel = lotsActive.findIndex(elemnt => {
      return elemnt == Type;
    });
    if(indexForDel > -1)
      lotsActive.splice(indexForDel,1);
    let indexForDel2 = defaultArrayOfParkingLotsToShow.findIndex(elemnt => {
      return elemnt == Type;
    });
    if(indexForDel2 > -1) {
      defaultArrayOfParkingLotsToShow.splice(indexForDel2);
    }
}

function ChangeSidebarState(parkingLot) {
  if(document.getElementById("main-sidebar")) {
    document.getElementById(`normal-${parkingLot.id}`).innerHTML = parkingLot.normal_available;
    document.getElementById(`progress-normal-${parkingLot.id}`).style.width = parkingLot.normal_available / (parkingLot.normal_available + parkingLot.normal_occupied) * 100 + "%";
    if(parkingLot.capacity_handicap) {
      document.getElementById(`handicap-${parkingLot.id}`).innerHTML = parkingLot.handicap_available;
      document.getElementById(`progress-handicap-${parkingLot.id}`).style.width = parkingLot.handicap_available / (parkingLot.handicap_available + parkingLot.handicap_occupied) * 100 + "%";
    }
  }
}
