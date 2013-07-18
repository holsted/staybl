$(document).ready(function(){
  
  //Only load this javascript if a user is on the map page
  if(document.getElementById('map-canvas')){
    google.maps.Polygon.prototype.getBounds = function() {
        var bounds = new google.maps.LatLngBounds();
        var paths = this.getPaths();
        var path;        
        for (var i = 0; i < paths.getLength(); i++) {
            path = paths.getAt(i);
            for (var ii = 0; ii < path.getLength(); ii++) {
                bounds.extend(path.getAt(ii));
            }
        }
        return bounds;
    }

    var markers = [];
    var marker;
    var polygons = {};
    var selectedColor;
    var infoWindow;
    var drawingManager;
    var currentOverlay;
    var colors = ['#32CD32'];
    var selectedColor;
    var colorButtons = {};
    var mapBounds;
    var map;
    var primaryId;
    var city = getURLParam("city");
    
    // Used to detect initial (useless) popstate.
    // If history.state exists, assume browser isn't going to fire initial popstate.
    //I copy and pasted this from stack overflow. 
    var popped = ('state' in window.history && window.history.state !== null), initialURL = location.href;

    $(window).bind('popstate', function (event) {
      // Ignore inital popstate that some browsers fire on page load
      var initialPop = !popped && location.href == initialURL
      popped = true

      if (initialPop) return;

      removeOverlays();
      var id = getURLParam("id");

      if($('#new-map')){
        if(id){
          $("#area_name").val(id);
          getArea(id);
        }
      }
      else{
        $('.secondary').show();
        
        if(id){
          var area = $('[data-id="'+id+'"]');
          updateAreaList(area);
        }
        else{
          var area = $('[data-id="'+primaryId+'"]');
          updateAreaList(area);
        }
      }
      
     


    });

    function initialize() {
      // turns on the new google maps
      google.maps.visualRefresh = true;

      // retrieve and parse the name of the place from the URL
      var city = getURLParam("city");
      primaryId = $('.primary').data('id');
      

      var mapOptions = {
        zoom: 13,
        scrollwheel: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      var polygonOptions = {
          strokeWeight: 0,
          fillOpacity: 0.45,
          editable: true,
          fillColor: '#32CD32',
          strokeColor: '#32CD32'
      };

      map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

      if(!map){
        $('map-canvas').html("It looks like we are having a problem loading your map. Stand by.")
      }
      if(document.getElementById("edit-map") || document.getElementById("new-map")){
        drawingManager = new google.maps.drawing.DrawingManager({
          drawingControl:false,
          drawingMode: google.maps.drawing.OverlayType.POLYGON,
          polygonOptions: polygonOptions,
          map: map
        });
      }

      if(document.getElementById('new-map')){
        addMarker(city);
      }
      else if(document.getElementById('edit-map')){
        var id = $('#edit-map').data('id');
        getArea(id);
      }
      else{
        var id = getURLParam('id');
        if (id){
          $('.secondary').show();
          var area = $('[data-id="'+id+'"]');
          updateAreaList(area);
        }
        else{
        getArea(primaryId);
        }
      }
     

      infoWindow = new google.maps.InfoWindow({});
      // Bias the autocomplete results to the map window
     
      google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
        if (e.type != google.maps.drawing.OverlayType.MARKER) {
          // Switch back to non-drawing mode after drawing a shape.
          drawingManager.setDrawingMode(null);

          // Add an event listener that selects the newly-drawn shape when the user
          // mouses down on it.
          var newOverlay = e.overlay;
          newOverlay.type = e.type;
          newOverlay.editable = true;
          
          google.maps.event.addListener(newOverlay, 'click', function(e) {
            setInfoWindow(newOverlay, function(content){
                infoWindow.setContent(content);
                infoWindow.open(map);
                infoWindow.setPosition(e.latLng);
                addInfoWindowListeners(newOverlay);
              });
          });

          setSelection(newOverlay);
          setCoordinates(newOverlay);
        }

        google.maps.event.addListener(newOverlay.getPath(), 'set_at', function() {
          setCoordinates(newOverlay);
        });

        google.maps.event.addListener(newOverlay.getPath(), 'insert_at', function() {
          setCoordinates(newOverlay);
        });

      });

       // Clear the current selection when the drawing mode is changed, or when the
      // map is clicked.
      google.maps.event.addListener(drawingManager, 'drawingmode_changed', clearSelection);
      google.maps.event.addListener(map, 'click', clearSelection);



    }

    // function to geocode an address and add a market to the map
    function addMarker(city){
      geocoder = new google.maps.Geocoder();
      if(city){
        geocoder.geocode({address: city}, function(results, status) {
          var location = results[0].geometry.location;  
          marker = new google.maps.Marker({
            position: location,
            visible: false,
            map: map
          });
          markers.push(marker);
          map.panTo(location);
        });
      }
    }

    // remove all markers in markers array
    function removeMarkers(){
      for (var i = 0; i < markers.length; i++) {
       markers[i].setMap(null);
      }
    }

    //function to retrieve the params from the URL.
    function getURLParam(name) {
      return decodeURIComponent((new RegExp("[?|&]" + name + "=([^&;]+?)(&|##|;|$)").exec(location.search) || [null, ""])[1].replace(/\+/g, "%20")) || null;
    }


    function getArea(id){

      $.getJSON("/areas/"+id, function(data) {
              $('#area-description').html(data.description);
              setPolygon(data);
        });
    }

    function setPolygon(data){
        var polygon = data.the_geom.replace("MULTIPOLYGON (((", "");
          polygon = polygon.replace(")))","");
          polygon = polygon.split(',');

      
      var polygonPath = new Array();
      for(var j=0; j<polygon.length;j++){
        var point = polygon[j].trim().split(' ');
    
        var gPoint = new google.maps.LatLng(parseFloat(point[1]), parseFloat(point[0]));

        polygonPath.push(gPoint);
      } 
      var polygon = new google.maps.Polygon({
          paths: polygonPath,
          strokeColor: '#32CD32',
          strokeOpacity: 0.5,
          strokeWeight: 0,
          fillColor: '#32CD32',
          fillOpacity: 0.5,
          id:data.id,
          clickable:false,  
          editable:false,
          name: data.name,
          map: map 
      }); 

      if(document.getElementById('edit-map') || document.getElementById('new-map')){
        drawingManager.setDrawingMode(null);
        polygon.setOptions({
          editable: true,
          clickable:true
        });
      }
      //add the polygon to the global polygon array
      polygons[data.id] = polygon;

      map.fitBounds(polygon.getBounds());
      google.maps.event.addListenerOnce(map, 'zoom_changed', function() {
        if(map.getZoom() >= 13){
          map.setZoom(13);
        } 
      });
        

      google.maps.event.addListener(polygon.getPath(), 'set_at', function() {
        setCoordinates(polygon);
      });

      google.maps.event.addListener(polygon.getPath(), 'insert_at', function() {
        setCoordinates(polygon);
      });

      google.maps.event.addListener(polygon, 'click', function(e){  
        setSelection(polygon);
        setInfoWindow(polygon, function(content){
          infoWindow.setContent(content);
          infoWindow.open(map);
          infoWindow.setPosition(e.latLng);
          addInfoWindowListeners(polygon);
        });
      });
    }

    function clearSelection() {
      if (currentOverlay) {
        currentOverlay.setEditable(false);
        currentOverlay = null;
      }
    }

    function setSelection(overlay) {
      clearSelection();
      currentOverlay = overlay;
      overlay.setEditable(true);
    }

    function deleteCurrentOverlay() {
      if (currentOverlay) {
        currentOverlay.setMap(null);
         drawingManager.setOptions({
            drawingMode: google.maps.drawing.OverlayType.POLYGON
          });
        document.getElementById('area_polygon').value = '';
      }
    }

    function removeOverlays(){
      
      for (var id in polygons) {
        if (polygons.hasOwnProperty(id)) { 
          polygons[id].setMap(null);
        }
      }
    }
      

    function setInfoWindow(overlay, callback){
      if(overlay.editable){

        var deleteButton = document.createElement('button');
        deleteButton.id = "delete-button";
        deleteButton.type = "button";
        deleteButton.className = "btn btn-small";
        deleteButton.innerHTML = "Remove Overlay";

        var windowContent = document.createElement('div');
        windowContent.id = 'edit-overlay';

        
        windowContent.appendChild(deleteButton);

        callback(windowContent);
      }

      else{
        if(document.getElementById('edit-map')){
          setSelection(overlay);
        }
      }
    }

    function setCoordinates(newOverlay){
      // complete functions
      var path = newOverlay.getPath();
      var xy;
      var polygon = '';
        // Iterate over the polygonBounds vertices.
      for (var i = 0; i < path.length; i++) {
        xy = path.getAt(i);
        polygon += xy.lat() + ' ' + xy.lng() + ', ';
      }

      var final_xy = path.getAt(0);
      polygon += final_xy.lat() + ' ' + final_xy.lng();
  
      var polyCoordinates = 'POLYGON((' + polygon + '))';

      document.getElementById('area_the_geom').value = polyCoordinates;
    }

    function addInfoWindowListeners(polygon){
      if(document.getElementById('edit-overlay')){
        google.maps.event.addListener(currentOverlay, 'rightclick', function(e){
          if (e.vertex != null) {
            selectedShape.getPath().removeAt(e.vertex);
          }
        });
        google.maps.event.addDomListener(document.getElementById('delete-button'), 'click', function(){
          if(currentOverlay.id){
               $.ajax({
                  type: 'DELETE',
                  url: '/areas/'+currentOverlay.id+'.json'
                });   
            }
            infoWindow.close();
            deleteCurrentOverlay();
        });

        google.maps.event.addListener(infoWindow,'closeclick',function(){
            
        });
      }
    }

    function updateAreaList(area){
       
        var upVote = area.find('.area-up-vote');
        var downVote = area.find('.area-down-vote');
        var selectedArea = area.find('.area');
        var selectedName = area.find('.area-name');
        var selectedTally = area.find('.area-tally');

        upVote.show();
        downVote.show();

       
        selectedName.removeClass('span3 offset4').addClass('span8');
        selectedTally.removeClass('span1').addClass('row-fluid block');

        var primaryArea = $('.primary').find('.area');
        var primaryTally = $('.primary').find('.area-tally');
        var primaryName = $('.primary').find('.area-name');

        primaryTally.removeClass('row-fluid block').addClass('span1');
        primaryName.addClass('span3 offset4');


        $('.primary').find('.area-name').addClass('span3 offset4');
        $('.primary').find('.area-up-vote').hide();
        $('.primary').find('.area-down-vote').hide();

        $('.primary').removeClass('primary').addClass('secondary');
        area.addClass('primary').removeClass('secondary');

        var areaId = area.data('id');
        var ul = $('#area-list');
        var li = ul.children('.secondary');
            li.detach().sort(function(a,b) {
                return $(b).data('votes') - $(a).data('votes');  
            });
         
        

        ul.append(li);
        $('.secondary').hide();
        $('.add-area').hide();

        getArea(areaId);

    }

    $('#show-more').on('click', function(){
        $('.secondary').fadeIn('slow');
        $('.add-area').fadeIn('slow');
      });
    
    $('#areas').on('click', '.secondary', function(){
        
       
        updateAreaList($(this));
        removeOverlays();
        var id = $(this).data('id'); 
        history.pushState(
                  null, 
                  'Staybl',
                  window.location.pathname+'?city='+city+'&id='+id);
        
      });

    $(document).on('ajax:complete', '.up-vote', function(event, data, status, xhr) {
          switch(data.status){
            case 200:
              alert('upvoted!');
              $(this).closest('#votes').html(data.responseText);    
              break
            case 404 :
              alert('up vote failed');
              $(this).closest('#votes').html(data.responseText);    
              break
            case 401 : 
              console.log(event.target.pathname);
              $('#modal-login').modal('show');
              break
            }
          
    });

    $(document).on('ajax:complete', '.down-vote', function(event, data, status, xhr) {
         switch(data.status){
            case 200:
              alert('down voted!');
              $(this).closest('#votes').html(data.responseText);    
              break
            case 404:
              alert('down vote failed');
              $(this).closest('#votes').html(data.responseText); 
              break
            case 401: 
              $('#modal-login').modal('show');
              break
          }
            
    });

    $('#area_id').on('change', function(){
        var id = $(this).val();
       removeOverlays();
        history.pushState(
                  null, 
                  'Staybl',
                  window.location.pathname+'?city='+city+'&id='+id);
  
      if(id == 0){
        $('#new_area_name').css('display','inline-block');
        map.panTo(marker.position);
      }
      else{
        $('#new_area_name').css('display','none');
        getArea(id);
      }
    });
    $('#areas').on('click', '.primary', function(){
      $('.secondary').hide();
      $('.add-area').hide();
    });
    initialize();
  }
});