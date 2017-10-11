angular.module('orsApp')
    .directive('orsMap', () => {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                orsMap: '='
            },
            link: (scope, element, attrs) => {},
            controller: ['$scope', '$filter', '$compile', '$timeout', 'orsSettingsFactory', 'orsLocationsService', 'orsObjectsFactory', 'orsRequestService', 'orsUtilsService', 'orsMapFactory', 'orsCookiesFactory', 'lists', 'globals', 'mappings', 'orsNamespaces', ($scope, $filter, $compile, $timeout, orsSettingsFactory, orsLocationsService, orsObjectsFactory, orsRequestService, orsUtilsService, orsMapFactory, orsCookiesFactory, lists, globals, mappings, orsNamespaces) => {
                $scope.translateFilter = $filter('translate');
                const mapsurfer = L.tileLayer(orsNamespaces.layerMapSurfer.url, {
                    attribution: orsNamespaces.layerMapSurfer.attribution
                });
                const openstreetmap = L.tileLayer(orsNamespaces.layerOSM.url, {
                    attribution: orsNamespaces.layerOSM.attribution
                });
                const opencyclemap = L.tileLayer(orsNamespaces.layerOSMCycle.url, {
                    attribution: orsNamespaces.layerOSMCycle.attribution
                });
                const transportdark = L.tileLayer(orsNamespaces.layerOSMDark.url, {
                    attribution: orsNamespaces.layerOSMDark.attribution
                });
                const outdoors = L.tileLayer(orsNamespaces.layerOutdoors.url, {
                    attribution: orsNamespaces.layerOutdoors.attribution
                });
                const stamen = L.tileLayer(orsNamespaces.layerStamen.url, {
                    attribution: orsNamespaces.layerStamen.attribution
                });
                const hillshade = L.tileLayer(orsNamespaces.overlayHillshade.url, {
                    format: 'image/png',
                    opacity: 0.45,
                    transparent: true,
                    attribution: '<a href="http://srtm.csi.cgiar.org/">SRTM</a>; ASTER GDEM is a product of <a href="http://www.meti.go.jp/english/press/data/20090626_03.html">METI</a> and <a href="https://lpdaac.usgs.gov/products/aster_policies">NASA</a>'
                });
                $scope.geofeatures = {
                    layerLocationMarker: L.featureGroup(),
                    layerRoutePoints: L.featureGroup(),
                    layerRouteLines: L.featureGroup(),
                    layerAvoid: L.featureGroup(),
                    layerAccessibilityAnalysis: L.featureGroup(),
                    layerAccessibilityAnalysisNumberedMarkers: L.featureGroup(),
                    layerEmph: L.featureGroup(),
                    layerTracks: L.featureGroup(),
                    layerRouteNumberedMarkers: L.featureGroup(),
                    layerRouteExtras: L.featureGroup(),
                    layerRouteDrag: L.featureGroup(),
                    layerLocations: new L.MarkerClusterGroup({
                        showCoverageOnHover: false,
                        disableClusteringAtZoom: 14,
                        spiderLegPolylineOptions: {
                            weight: 1.5,
                            color: '#222',
                            opacity: 0.5, // for defaults
                            distanceMarkers: {
                                lazy: true
                            }, // for hiding the markers
                        }
                    }),
                    layerTmcMarker: L.featureGroup()
                };
                $scope.mapModel = {
                    map: $scope.orsMap,
                    geofeatures: $scope.geofeatures
                };
                $scope.locateControl = L.control.locate({
                        locateOptions: {
                            enableHighAccuracy: true,
                            showPopup: false,
                            strings: {
                                title: ""
                            }
                        }
                    })
                    .addTo($scope.mapModel.map);
                /* HEIGHTGRAPH CONTROLLER */
                $scope.hg = L.control.heightgraph({
                    width: 800,
                    height: 280,
                    margins: {
                        top: 10,
                        right: 30,
                        bottom: 55,
                        left: 50
                    },
                    position: "bottomright",
                    mappings: mappings
                });
                $scope.zoomControl = new L.Control.Zoom({
                        position: 'topright'
                    })
                    .addTo($scope.mapModel.map);
                L.control.scale()
                    .addTo($scope.mapModel.map);
                /* AVOID AREA CONTROLLER */
                L.NewPolygonControl = L.Control.extend({
                    options: {
                        position: 'topright'
                    },
                    onAdd: function(map) {
                        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control', container),
                            link = L.DomUtil.create('a', 'leaflet-avoid-area', container);
                        link.href = '#';
                        link.title = 'Create a new area avoid polygon';
                        L.DomEvent.on(link, 'click', L.DomEvent.stop)
                            .on(link, 'click', function() {
                                map.editTools.startPolygon();
                            });
                        return container;
                    }
                });
                let measureControlOptions = {
                    position: 'bottomleft',
                    primaryLengthUnit: 'meters',
                    secondaryLengthUnit: 'kilometers',
                    primaryAreaUnit: 'hectares',
                    secondaryAreaUnit: 'sqmeters',
                    activeColor: '#cf5f5f',
                    completedColor: '#e29f9f',
                    background: '#FFF',
                    localization: 'en',
                    popupOptions: {
                        className: 'leaflet-measure-resultpopup',
                        autoPanPadding: [10, 10]
                    }
                };
                $scope.measureControl = new L.control.measure(measureControlOptions)
                    .addTo($scope.mapModel.map);
                // if user settings change..
                orsSettingsFactory.userOptionsSubject.subscribe(settings => {
                    if (settings.language) {
                        $scope.mapModel.map.removeControl($scope.measureControl);
                        measureControlOptions.localization = lists.measure_locale[settings.language];
                        $scope.measureControl = L.control.measure(measureControlOptions)
                            .addTo($scope.mapModel.map);
                        const el = angular.element(document.querySelector('.js-toggle'))
                            .empty();
                    }
                });
                // mapOptionsInitSubject is a replay subject and only subscribes once
                let mapInitSubject = orsSettingsFactory.mapOptionsInitSubject.subscribe(settings => {
                    console.error('ONCE', JSON.stringify(settings))
                    if (settings.lat && settings.lng && settings.zoom) {
                        $scope.orsMap.setView({
                            lat: settings.lat,
                            lng: settings.lng
                        }, settings.zoom);
                    } else {
                        // Heidelberg
                        $scope.orsMap.setView([49.409445, 8.692953], 13);
                        if (orsCookiesFactory.getMapOptions()) {
                            // Welcome box
                            $scope.welcomeMsgBox = L.control({
                                position: 'topright'
                            });
                            $scope.welcomeMsgBox.onAdd = function(map) {
                                var div = $compile('<ors-welcome-box></ors-welcome-box>')($scope)[0];
                                return div;
                            };
                            $timeout(function() {
                                $scope.mapModel.map.addControl($scope.welcomeMsgBox);
                            }, 500);
                        }
                    }
                    mapInitSubject.dispose();
                });
                // sign up for API
                $scope.signupBox = L.control({
                    position: 'topleft'
                });
                $scope.signupBox.onAdd = function(map) {
                    var div = $compile('<ors-signup-box></ors-signup-box>')($scope)[0];
                    return div;
                };
                $timeout(function() {
                    $scope.mapModel.map.addControl($scope.signupBox);
                }, 500);
                // hack to remove measure string from box
                const el = angular.element(document.querySelector('.js-toggle'))
                    .empty();
                $scope.mapModel.map.addControl(new L.NewPolygonControl());
                const deleteShape = function(e) {
                    if ((e.originalEvent.altKey || e.originalEvent.metaKey) && this.editEnabled()) {
                        this.editor.deleteShapeAt(e.latlng);
                        $scope.mapModel.geofeatures.layerAvoid.removeLayer(e.target._leaflet_id);
                        // remove overlay in controls if no regions left
                        if ($scope.geofeatures.layerAvoid.getLayers()
                            .length === 0) $scope.layerControls.removeLayer($scope.geofeatures.layerAvoid);
                        setSettings();
                    }
                };
                const deleteVertex = function(e) {
                    e.vertex.delete();
                };
                const setSettings = function() {
                    const polygons = $scope.geofeatures.layerAvoid.toGeoJSON();
                    let avoidPolygons = {
                        type: polygons.features.length > 1 ? 'MultiPolygon' : 'Polygon'
                    };
                    if (polygons.features.length == 1) {
                        avoidPolygons.coordinates = [orsUtilsService.trimCoordinates(polygons.features[0].geometry.coordinates[0], 5)];
                    } else {
                        avoidPolygons.coordinates = [];
                        for (let i = 0; i < polygons.features.length; i++) {
                            avoidPolygons.coordinates.push([orsUtilsService.trimCoordinates(polygons.features[i].geometry.coordinates[0], 5)]);
                        }
                    }
                    orsSettingsFactory.setAvoidableAreas(avoidPolygons);
                };
                const shapeDrawn = function(e) {
                    //$scope.layerControls.addOverlay($scope.geofeatures.layerAvoid, 'Avoidable regions');
                    setSettings();
                };
                $scope.baseLayers = {
                    "MapSurfer": mapsurfer,
                    "OpenStreetMap": openstreetmap,
                    "OpenCycleMap": opencyclemap,
                    "Transport Dark": transportdark,
                    "Outdoors": outdoors
                };
                $scope.overlays = {
                    "Hillshade": hillshade
                };
                $scope.mapModel.map.on("load", (evt) => {
                    mapsurfer.addTo($scope.orsMap);
                    $scope.mapModel.geofeatures.layerRoutePoints.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerRouteLines.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerRouteNumberedMarkers.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerAvoid.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerAccessibilityAnalysis.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerAccessibilityAnalysisNumberedMarkers.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerEmph.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerTracks.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerRouteExtras.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerLocations.addTo($scope.mapModel.map);
                    $scope.mapModel.geofeatures.layerRouteDrag.addTo($scope.mapModel.map);
                    // add layer control
                    $scope.layerControls = L.control.layers($scope.baseLayers, $scope.overlays)
                        .addTo($scope.mapModel.map);
                    $scope.mapModel.map.editTools.featuresLayer = $scope.geofeatures.layerAvoid;
                    // add eventlisteners for layeravoidables only
                    $scope.mapModel.geofeatures.layerAvoid.on('layeradd', function(e) {
                        if (e.layer instanceof L.Path) e.layer.on('click', L.DomEvent.stop)
                            .on('click', deleteShape, e.layer);
                        if (e.layer instanceof L.Path) e.layer.on('dblclick', L.DomEvent.stop)
                            .on('dblclick', e.layer.toggleEdit);
                    });
                    $scope.mapModel.map.on('editable:drawing:commit', shapeDrawn);
                    $scope.mapModel.map.on('editable:vertex:deleted', setSettings);
                    $scope.mapModel.map.on('editable:vertex:dragend', setSettings);
                    $scope.mapModel.map.on('editable:vertex:altclick', deleteVertex);
                });
                /**
                 * Listens to left mouse click on map
                 * @param {Object} e: Click event
                 */
                $scope.popup = L.popup({
                    minWidth: 150,
                    closeButton: false,
                    className: 'cm-popup'
                });
                $scope.pointPopup = L.popup({
                    minWidth: 175,
                    maxHeight: 300,
                    closeButton: true,
                    className: 'cm-popup'
                });
                $scope.mapModel.map.on('contextmenu', (e) => {
                    $scope.displayPos = e.latlng;
                    const popupDirective = $scope.routing === true ? '<ors-popup></ors-popup>' : '<ors-aa-popup></ors-aa-popup>';
                    const popupContent = $compile(popupDirective)($scope);
                    $scope.popup.setContent(popupContent[0])
                        .setLatLng($scope.displayPos)
                        .openOn($scope.mapModel.map);
                    $timeout(function() {
                        $scope.popup.update();
                    }, 300);
                });
                //$scope.mapModel.map.on('baselayerchange', emitMapChangeBaseMap);
                //$scope.mapModel.map.on('overlayadd', emitMapChangeOverlay);
                //$scope.mapModel.map.on('overlayremove', emitMapChangeOverlay);
                $scope.mapModel.map.on('zoomend', (e) => {
                    let layerRouteLines = $scope.mapModel.geofeatures.layerRouteLines;
                    const currentZoom = $scope.mapModel.map.getZoom();
                    if (currentZoom >= 15) {
                        d3.select($scope.mapModel.map.getPanes()
                                .overlayPane)
                            .style("opacity", 0.5);
                    } else {
                        d3.select($scope.mapModel.map.getPanes()
                                .overlayPane)
                            .style("opacity", 1);
                    }
                    $scope.setMapOptions();
                });
                $scope.mapModel.map.on('moveend', (e) => {
                    $scope.setMapOptions();
                });
                $scope.mapModel.map.on('mouseover', (e) => {
                    console.log(true)
                });
                $scope.setMapOptions = () => {
                    const mapCenter = $scope.mapModel.map.getCenter();
                    const mapZoom = $scope.mapModel.map.getZoom();
                    const mapOptions = {
                        lat: mapCenter.lat,
                        lng: mapCenter.lng,
                        zoom: mapZoom
                    };
                    orsCookiesFactory.setMapOptions(mapOptions);
                    // update permalink 
                    let userOptions = orsSettingsFactory.getUserOptions();
                    userOptions.lat = mapCenter.lat;
                    userOptions.lng = mapCenter.lng;
                    userOptions.zoom = mapZoom;
                    // dont set user options here, will otherwise end in a loop
                    orsUtilsService.parseSettingsToPermalink(orsSettingsFactory.getSettings(), userOptions);
                };
                $scope.processMapWaypoint = (idx, pos, updateWp = false, fireRequest = true, fromHover = false) => {
                    // add waypoint to map
                    // get the address from the response
                    if (updateWp) {
                        orsSettingsFactory.updateWaypoint(idx, '', pos, fireRequest);
                    } else {
                        const waypoint = orsObjectsFactory.createWaypoint('', pos, 1);
                        orsSettingsFactory.insertWaypointFromMap(idx, waypoint, fireRequest, fromHover);
                    }
                    orsSettingsFactory.getAddress(pos, idx, updateWp, fromHover);
                    orsUtilsService.parseSettingsToPermalink(orsSettingsFactory.getSettings(), orsSettingsFactory.getUserOptions());
                    // close the popup
                    $scope.mapModel.map.closePopup();
                };
                $scope.addNumberedMarker = (geom, featureId, layerCode, isIsochrones = false) => {
                    const lat = geom[1] || geom.lat;
                    const lng = geom[0] ||  geom.lng;
                    let textLabelclass;
                    if (isIsochrones) {
                        textLabelclass = 'textLabelclass-isochrones';
                    }
                    let marker = L.marker(L.latLng(lat, lng), {
                        icon: createLabelIcon(textLabelclass, parseInt(featureId) + 1),
                        index: featureId
                    });
                    marker.bindPopup("<b>Position</b><br>" + lat + ', ' + lng)
                        .openPopup();
                    marker.addTo($scope.mapModel.geofeatures[layerCode]);
                };
                $scope.addWaypoint = (idx, iconIdx, pos, fireRequest = true, aaIcon = false) => {
                    let waypointIcon = aaIcon === true ? L.divIcon(lists.waypointIcons[3]) : L.divIcon(lists.waypointIcons[iconIdx]);
                    const waypointsLength = orsSettingsFactory.getWaypoints()
                        .length;
                    if (aaIcon) {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="location-number-circle"><div class="via-number-text"></div></div></i>';
                    } else if (idx > 0 && idx < waypointsLength - 1) {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="via-number-circle"><div class="via-number-text">' + idx + '</div></div></i>';
                    } else if (idx == 0) {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="start-number-circle"><div class="via-number-text"> ' + 'A' + ' </div></div></i>';
                    } else {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="end-number-circle"><div class="via-number-text"> ' + 'B' + ' </div></div></i>';
                    }
                    // create the waypoint marker
                    let wayPointMarker = new L.marker(pos, {
                        icon: waypointIcon,
                        draggable: 'true',
                        idx: idx,
                        autoPan: true,
                        autoPanPadding: [50, 50],
                        autoPanSpeed: 10
                    });
                    wayPointMarker.addTo($scope.mapModel.geofeatures.layerRoutePoints);
                    wayPointMarker.on('dragend', (event) => {
                        // idx of waypoint
                        const idx = event.target.options.idx;
                        const pos = event.target._latlng;
                        $scope.processMapWaypoint(idx, pos, true, fireRequest);
                    });
                };
                /** Clears the map
                 * @param {boolean} switchApp: Whether accessibility layer should be cleared
                 */
                $scope.clearMap = (switchApp = false) => {
                    $scope.mapModel.map.closePopup();
                    $scope.mapModel.geofeatures.layerLocationMarker.clearLayers();
                    $scope.mapModel.geofeatures.layerRouteLines.clearLayers();
                    $scope.mapModel.geofeatures.layerEmph.clearLayers();
                    $scope.mapModel.geofeatures.layerRouteExtras.clearLayers();
                    $scope.mapModel.geofeatures.layerRouteDrag.clearLayers();
                    if ($scope.hg) $scope.hg.remove();
                    if (switchApp) {
                        $scope.mapModel.geofeatures.layerRoutePoints.clearLayers();
                        $scope.mapModel.geofeatures.layerAvoid.clearLayers();
                        $scope.mapModel.geofeatures.layerAccessibilityAnalysis.clearLayers();
                        $scope.mapModel.geofeatures.layerAccessibilityAnalysisNumberedMarkers.clearLayers();
                    }
                };
                $scope.clearLayer = (layer) => {
                    $scope.mapModel.geofeatures[layer].clearLayers();
                };
                $scope.reAddWaypoints = (waypoints, fireRequest = true, aaIcon = false) => {
                    $scope.clearLayer('layerRoutePoints');
                    let setCnt = 0;
                    angular.forEach(waypoints, (waypoint, idx) => {
                        var iconIdx = orsSettingsFactory.getIconIdx(idx);
                        if (waypoint._latlng.lat && waypoint._latlng.lng) {
                            $scope.addWaypoint(idx, iconIdx, waypoint._latlng, fireRequest, aaIcon);
                        }
                        if (waypoint._set == 1) setCnt += 1;
                    });
                    // if only one waypoint is set, clear the route line layer
                    if (setCnt == 1) $scope.clearLayer('layerRouteLines');
                };
                $scope.reshuffleIndicesText = (actionPackage) => {
                    console.log(actionPackage)
                    let i = 0;
                    $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                        let markerIcon;
                        markerIcon = actionPackage.layerCode == lists.layers[5] ? createLabelIcon("textLabelclass-isochrones", i + 1) : createLabelIcon("textLabelclass", i + 1);
                        layer.setIcon(markerIcon);
                        layer.options.index = i;
                        i++;
                    });
                };
                /**
                 * Either zooms to feature, geometry or entire layer
                 */
                $scope.zoom = (actionPackage) => {
                    if (typeof actionPackage != 'undefined') {
                        if (typeof actionPackage.featureId != 'undefined') {
                            $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                                if (layer.options.index == actionPackage.featureId) {
                                    $scope.orsMap.fitBounds(layer.getBounds());
                                }
                            });
                        } else if (actionPackage.featureId === undefined) {
                            if (actionPackage.geometry !== undefined) {
                                if (actionPackage.geometry.lat && actionPackage.geometry.lng) {
                                    $timeout(function() {
                                        $scope.mapModel.map.panTo(actionPackage.geometry);
                                    }, 100);
                                    //$scope.mapModel.map.setZoom(13);
                                } else {
                                    let bounds = new L.LatLngBounds(actionPackage.geometry);
                                    $scope.orsMap.fitBounds(bounds);
                                }
                            } else {
                                $scope.orsMap.fitBounds(new L.featureGroup(Object.keys($scope.mapModel.geofeatures)
                                        .map((key) => {
                                            return $scope.mapModel.geofeatures[key];
                                        }))
                                    .getBounds());
                            }
                        }
                    } else {
                        $scope.orsMap.fitBounds(new L.featureGroup(Object.keys($scope.mapModel.geofeatures)
                                .map((key) => {
                                    return $scope.mapModel.geofeatures[key];
                                }))
                            .getBounds());
                    }
                };
                /** 
                 * Highlights marker on map
                 * @param {Object} actionPackage - The action actionPackage
                 */
                $scope.highlightWaypoint = (actionPackage) => {
                    let waypointIcon = L.divIcon(lists.waypointIcons[4]);
                    const waypointsLength = orsSettingsFactory.getWaypoints()
                        .length;
                    if (actionPackage.featureId > 0 && actionPackage.featureId < waypointsLength - 1) {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' + actionPackage.featureId + '</div></div></i>';
                    } else if (actionPackage.featureId == 0) {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' + 'A' + '</div></div></i>';
                    } else {
                        waypointIcon.options.html = '<i class="fa fa-map-marker"><div class="highlight-number-circle"><div class="via-number-text">' + 'B' + '</div></div></i>';
                    }
                    let wayPointMarker = new L.marker(actionPackage.geometry, {
                        icon: waypointIcon
                    });
                    wayPointMarker.addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                };
                $scope.highlightPoi = (actionPackage) => {
                    let locationsIcon = L.divIcon(lists.locationsIconHighlight);
                    locationsIcon.options.html = lists.locations_icons[$scope.subcategoriesLookup[parseInt(actionPackage.style)]];
                    let locationsMarker = L.marker(actionPackage.geometry, {
                        icon: locationsIcon
                    });
                    locationsMarker.addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                };
                $scope.addLocations = (actionPackage) => {
                    //$scope.layerControls.addOverlay($scope.geofeatures.layerLocations, 'Locations');
                    $scope.subcategoriesLookup = orsLocationsService.getSubcategoriesLookup();
                    $scope.mapModel.geofeatures[actionPackage.layerCode].clearLayers();
                    const highlightFeature = (e) => {
                        // const layer = e.target;
                        // let locationsIconHighlight = L.divIcon(lists.locationsIconHighlight);
                        // locationsIconHighlight.options.html = lists.locations_icons[$scope.subcategoriesLookup[parseInt(layer.feature.properties.category)]];
                        // layer.setIcon(locationsIconHighlight);
                    };
                    const resetHighlight = (e) => {
                        // const layer = e.target;
                        // let locationsIconHighlightReset = L.divIcon(lists.locationsIcon);
                        // locationsIconHighlightReset.options.html = lists.locations_icons[$scope.subcategoriesLookup[parseInt(layer.feature.properties.category)]];
                        // layer.setIcon(locationsIconHighlightReset);
                    };
                    const onEachFeature = (feature, layer) => {
                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight
                        });
                        let popupContent = '';
                        if (feature.properties.name) popupContent += '<strong>' + feature.properties.name + '</strong><br>';
                        if (feature.properties.address) {
                            popupContent += lists.locations_icons.address + ' ';
                            if (feature.properties.address.street) popupContent += feature.properties.address.street + ', ';
                            if (feature.properties.address.house_number) popupContent += feature.properties.address.house_number + ', ';
                            if (feature.properties.address.postal_code) popupContent += feature.properties.address.postal_code + ', ';
                            if (feature.properties.address.locality) popupContent += feature.properties.address.locality + ', ';
                            if (feature.properties.address.region) popupContent += feature.properties.address.region + ', ';
                            if (feature.properties.address.country) popupContent += feature.properties.address.country + ', ';
                            popupContent = popupContent.slice(0, -2);
                        }
                        if (feature.properties.phone) popupContent += '<br>' + lists.locations_icons.phone + ' ' + feature.properties.phone;
                        if (feature.properties.website) popupContent += '<br>' + lists.locations_icons.website + ' ' + '<a href="' + feature.properties.website + '" target=_blank>' + feature.properties.website + '</a>';
                        if (feature.properties.wheelchair) popupContent += '<br>' + lists.locations_icons.wheelchair;
                        if (feature.properties.osm_type == 1) {
                            popupContent += '<br><br><a href="http://www.openstreetmap.org/node/' + feature.properties.osm_id + '" target=_blank>Edit on OpenStreetMap</a>';
                        } else if (feature.properties.osm_type == 2) {
                            popupContent += '<br><br><a href="http://www.openstreetmap.org/way/' + feature.properties.osm_id + '" target=_blank>Edit on OpenStreetMap</a>';
                        } else {
                            popupContent += '<br><br><a href="http://www.openstreetmap.org/relation/' + feature.properties.osm_id + '" target=_blank>Edit on OpenStreetMap</a>';
                        }
                        popupContent += '<br>Source: © OpenStreetMap-Contributors';
                        layer.bindPopup(popupContent, {
                            className: 'location-popup'
                        });
                    };
                    let geojson = L.geoJson(actionPackage.geometry, {
                            pointToLayer: function(feature, latlng) {
                                // let locationsIcon = L.icon({
                                //     iconUrl: '/bower_components/Font-Awesome-SVG-PNG/black/png/22/btc.png',
                                //     iconSize: [22, 22], // size of the icon
                                // });
                                let locationsIcon = L.divIcon(lists.locationsIcon);
                                locationsIcon.options.html = lists.locations_icons[$scope.subcategoriesLookup[parseInt(feature.properties.category)]];
                                return L.marker(latlng, {
                                    icon: locationsIcon
                                });
                            },
                            onEachFeature: onEachFeature
                        })
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                };
                /** 
                 * adds features to specific layer
                 * @param {Object} actionPackage - The action actionPackage
                 */
                $scope.addFeatures = (actionPackage) => {
                    const isDistanceMarkers = orsSettingsFactory.getUserOptions()
                        .showDistanceMarkers === true ? true : false;
                    const polyLine = L.polyline(actionPackage.geometry, {
                            index: !(actionPackage.featureId === undefined) ? actionPackage.featureId : null,
                            interactive: false,
                            distanceMarkers: {
                                lazy: !isDistanceMarkers,
                                showAll: 13,
                                offset: 500,
                                cssClass: 'ors-marker-dist',
                                iconSize: [18, 18]
                            }
                        })
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                    polyLine.setStyle(actionPackage.style);
                };
                /** 
                 * adds interactive route 
                 * @param {Object} actionPackage - The action actionPackage
                 */
                $scope.addPolyline = (actionPackage) => {
                    $scope.mapModel.map.closePopup();
                    const polyLine = L.polyline(actionPackage.geometry, {
                            index: !(actionPackage.featureId === undefined) ? actionPackage.featureId : null,
                            interactive: true,
                            distanceMarkers: {
                                lazy: true
                            },
                            //bubblingMouseEvents: true
                        })
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                    polyLine.setStyle(actionPackage.style);
                };
                /*  copied from https://github.com/makinacorpus/Leaflet.GeometryUtil/blob/master/src/leaflet.geometryutil.js
                    @param {L.PolyLine} polyline Polyline on which the latlng will be search
                    @param {L.LatLng} latlng The position to search
                */
                $scope.locateOnLineCopiedFromGeometryUtil = (map, polyline, latlng) => {
                    const latlngs = polyline.getLatLngs();
                    if (latlng.equals(latlngs[0]))
                        return 0.0;
                    if (latlng.equals(latlngs[latlngs.length-1]))
                        return 1.0;

                    const point = L.GeometryUtil.closest(map, polyline, latlng, false),
                        lengths = L.GeometryUtil.accumulatedLengths(latlngs),
                        total_length = lengths[lengths.length-1];

                    let portion = 0,
                        found = false;

                    for (var i=0, n = latlngs.length-1; i < n; i++) {
                        let l1 = latlngs[i],
                            l2 = latlngs[i+1];
                        portion = lengths[i];
                        if (L.GeometryUtil.belongsSegment(point, l1, l2)) {
                            portion += l1.distanceTo(point);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        throw "Could not interpolate " + latlng.toString() + " within " + polyline.toString();
                    }
                    return {
                        factor: portion / total_length,
                        latlng: point,
                        index: i};
                };
                $scope.addPolylineHover = (actionPackage) => {
                    $scope.mapModel.map.closePopup();
                    $scope.polylineZone = L.polyline(actionPackage.geometry, {
                            distanceMarkers: {
                                lazy: true
                            }
                        })
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                    $scope.polylineZone.setStyle({
                        color: '#FFF',
                        weight: 100,
                        opacity: 0
                    });
                    $scope.polylineZone.on("mouseover", (e) => {
                        if ($scope.hoverPoint) $scope.hoverPoint.removeFrom($scope.mapModel.geofeatures.layerRouteDrag);
                    });
                    $scope.hoverPolyLine = L.polyline(actionPackage.geometry, {
                            interactive: true,
                            distanceMarkers: {
                                lazy: true
                            }
                        })
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                    $scope.hoverPolyLine.setStyle(actionPackage.style);
                    $scope.pointList = actionPackage.extraInformation.pointInformation;
                    $scope.hoverPolyLine.on("mousemove", (e) => {
                        $scope.addHoverPoint($scope.mapModel, $scope.hoverPolyLine, $scope.pointList, e.latlng);
                    });
                };
                /** 
                 * adds interactive point over a polyLine 
                 * @param {Object} e - The event
                 */
                $scope.addHoverPoint = (mapModel, hoverPolyLine, pointList, latlng) => {
                    if ($scope.hoverPoint) $scope.hoverPoint.removeFrom($scope.mapModel.geofeatures.layerRouteDrag);
                    let snappedPosition = $scope.locateOnLineCopiedFromGeometryUtil(mapModel.map, hoverPolyLine, latlng);
                    // center the point on the polyline
                    const hoverIcon = L.divIcon(lists.waypointIcons[5]);
                    hoverIcon.options.html = '<i class="fa fa-circle"></i>';
                    // create the waypoint marker
                    $scope.hoverPoint = new L.marker(snappedPosition.latlng, {
                            icon: hoverIcon,
                            draggable: 'true',
                            //bubblingMouseEvents: true
                        })
                        .addTo(mapModel.geofeatures.layerRouteDrag)
                        .on('dragend', (event) => {
                            $scope.processMapWaypoint(pointList[snappedPosition.index].segment_index + 1, event.target._latlng, false, true, true);
                            mapModel.geofeatures.layerRouteDrag.clearLayers();
                        })
                        .on('mousedown', (event) => {
                            hoverPolyLine.off('mousemove');
                            $scope.polylineZone.off('mouseover');
                        })
                        .on('mouseup', (event) => {
                            hoverPolyLine.on("mousemove", (e) => {
                                $scope.addHoverPoint(mapModel, hoverPolyLine, pointList, e.latlng);
                            });
                            $scope.polylineZone.on("mouseover", (e) => {
                                if ($scope.hoverPoint) $scope.hoverPoint.removeFrom($scope.mapModel.geofeatures.layerRouteDrag);
                            });
                        })
                        .on("click", (e) => {
                            $scope.mapModel.map.closePopup();
                            const snappedPosition = $scope.locateOnLineCopiedFromGeometryUtil(mapModel.map, hoverPolyLine, e.latlng);
                            //$scope.mapModel.geofeatures.layerRouteDrag.clearLayers();
                            $scope.distanceAtInterpolatedPoint = snappedPosition.factor * pointList[pointList.length - 1].distance;
                            $scope.interpolatedRoutePoint = pointList[snappedPosition.index];
                            const popupDirective = '<ors-route-point-popup></ors-route-point-popup>';
                            const popupContent = $compile(popupDirective)($scope);
                            $scope.pointPopup.setContent(popupContent[0])
                                .setLatLng(e.latlng)
                                .openOn($scope.mapModel.map);
                            $timeout(function() {
                                $scope.pointPopup.update();
                            });
                        });
                };
                /**
                 * adds numbered marker if not yet added 
                 * @param {Object} actionPackage - The action actionPackage
                 */
                $scope.addIsochronesMarker = (actionPackage) => {
                    $scope.addNumberedMarker(actionPackage.geometry, actionPackage.featureId, actionPackage.layerCode, true);
                };
                /**
                 * adds numbered marker if not yet added 
                 * @param {Object} actionPackage - The action actionPackage
                 */
                $scope.toggleIsochronesMarker = (actionPackage) => {
                    const idx = actionPackage.extraInformation.idx;
                    const toggle = actionPackage.extraInformation.toggle;
                    const marker = $scope.mapModel.geofeatures[actionPackage.layerCode].getLayers()[idx];
                    if (toggle) angular.element(marker._icon)
                        .addClass('hideMarker');
                    else angular.element(marker._icon)
                        .removeClass('hideMarker');
                };
                let createLabelIcon = function(labelClass, labelText) {
                    return L.divIcon({
                        className: labelClass,
                        html: labelText,
                        iconSize: L.point(17, 17)
                    });
                };
                $scope.removeIsochrones = (actionPackage) => {
                    const idx = actionPackage.featureId;
                    const layerToRemove = $scope.mapModel.geofeatures[actionPackage.layerCode].getLayers()[idx];
                    layerToRemove.removeFrom($scope.mapModel.geofeatures[actionPackage.layerCode]);
                };
                $scope.toggleIsochrones = (actionPackage) => {
                    const toggle = actionPackage.extraInformation.toggle;
                    const idx = actionPackage.extraInformation.idx;
                    $scope.mapModel.geofeatures[actionPackage.layerCode].getLayers()[idx].setStyle({
                        opacity: toggle === true ? 0 : 1,
                        weight: toggle === true ? 0 : 1,
                        fillOpacity: toggle === true ? 0 : 1
                    });
                };
                $scope.toggleIsochroneIntervals = (actionPackage) => {
                    const toggle = actionPackage.extraInformation.toggle;
                    const idx = actionPackage.extraInformation.idx;
                    const iIdx = actionPackage.extraInformation.iIdx;
                    $scope.mapModel.geofeatures[actionPackage.layerCode].getLayers()[idx].getLayers()[iIdx].setStyle({
                        opacity: toggle === true ? 0 : 1,
                        weight: toggle === true ? 0 : 1,
                        fillOpacity: toggle === true ? 0 : 1
                    });
                };
                $scope.getGradientColor = (rangePos, colorRangeStart) => {
                    const hsl = Math.floor(colorRangeStart - 120 * rangePos);
                    return "hsl(" + hsl + ", 100%, 50%" + ")";
                };
                $scope.colorRangeIsochronesRotator = lists.isochronesColorsRanges;
                $scope.addIsochrones = (actionPackage) => {
                    const randomColorsSelected = orsSettingsFactory.getUserOptions()
                        .randomIsochronesColors === true ? true : false;
                    let colorRangeStart = 120;
                    if (randomColorsSelected) {
                        colorRangeStart = $scope.colorRangeIsochronesRotator[0];
                        $scope.colorRangeIsochronesRotator.push(colorRangeStart);
                        $scope.colorRangeIsochronesRotator.splice(0, 1);
                    }
                    const isochrones = [];
                    const isochronesPane = 'isochronesPane' + actionPackage.featureId;
                    $scope.mapModel.map.createPane(isochronesPane);
                    for (let i = actionPackage.geometry.length - 1; i >= 0; i--) {
                        let isochrone = L.polygon(actionPackage.geometry[i].geometry.coordinates[0], {
                            fillColor: actionPackage.geometry.length == 1 ? $scope.getGradientColor(1, colorRangeStart) : $scope.getGradientColor(i / (actionPackage.geometry.length - 1), colorRangeStart),
                            color: '#FFF',
                            weight: 1,
                            fillOpacity: 1,
                            index: actionPackage.featureId,
                            pane: isochronesPane
                        });
                        isochrones.push(isochrone);
                    }
                    new L.FeatureGroup(isochrones)
                        .addTo($scope.mapModel.geofeatures[actionPackage.layerCode]);
                    $scope.opacityIsochrones();
                };
                $scope.opacityIsochrones = () => {
                    const mapPanes = $scope.mapModel.map.getPanes();
                    console.log(mapPanes)
                    for (let pane in mapPanes) {
                        if (pane.startsWith("isochronesPane")) {
                            let svg = d3.select(mapPanes[pane]);
                            svg.style("opacity", 0.5);
                            svg.selectAll("path")
                                .style("stroke-opacity", 1);
                        }
                    }
                };
                /** 
                 * clears layer entirely or specific layer in layer
                 */
                $scope.clear = (actionPackage) => {
                    if (!(actionPackage.featureId === undefined)) {
                        $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                            if (layer.options.index == actionPackage.featureId) {
                                $scope.mapModel.geofeatures[actionPackage.layerCode].removeLayer(layer);
                            }
                        });
                    } else {
                        $scope.mapModel.geofeatures[actionPackage.layerCode].clearLayers();
                    }
                };
                /** 
                 * clears featuregroup layer and checks for layers inside with specific index
                 */
                $scope.clearFeaturegroup = (actionPackage) => {
                    $scope.mapModel.geofeatures[actionPackage.layerCode].eachLayer((layer) => {
                        layer.eachLayer((subLayer) => {
                            if (subLayer.options.index == actionPackage.featureId) {
                                $scope.mapModel.geofeatures[actionPackage.layerCode].removeLayer(layer);
                                return;
                            }
                        });
                    });
                };
                orsSettingsFactory.subscribeToNgRoute(function onNext(route) {
                    //let svg = d3.select($scope.mapModel.map.getPanes().overlayPane);
                    $scope.clearMap(true);
                    $scope.routing = route == 'directions' ? true : false;
                    //if ($scope.routing) svg.style("opacity", 1);
                });
                orsSettingsFactory.subscribeToWaypoints(function onNext(d) {
                    console.log('changes in routing waypoints detected..', d);
                    const waypoints = d;
                    // re-add waypoints only after init
                    if (waypoints.length > 0) $scope.reAddWaypoints(waypoints, $scope.routing);
                });
                orsSettingsFactory.subscribeToAaWaypoints(function onNext(d) {
                    console.log('changes in aa waypoints detected..', d);
                    const waypoints = d;
                    // re-add waypoints only after init
                    if (waypoints.length > 0) $scope.reAddWaypoints(waypoints, $scope.routing, true);
                    // $scope.addWaypoint(idx, iconIdx, waypoint._latlng, fireRequest);
                });
                $scope.hereControl = L.control({
                    position: 'bottomright'
                });
                $scope.hereControl.onAdd = (map) => {
                    let div = $compile('<ors-here-popup></ors-here-popup>')($scope)[0];
                    L.DomEvent.disableClickPropagation(div);
                    return div;
                };
                $scope.showHereMessage = (pos) => {
                    $scope.mapModel.map.closePopup();
                    const lngLatString = orsUtilsService.parseLngLatString(pos);
                    const latLngString = orsUtilsService.parseLatLngString(pos);
                    // get the information of the rightclick location 
                    const payload = orsUtilsService.geocodingPayload(lngLatString, true);
                    const request = orsRequestService.geocode(payload);
                    request.promise.then((data) => {
                        $scope.address = {};
                        if (data.features.length > 0) {
                            const addressObj = orsUtilsService.addShortAddresses(data.features)[0];
                            $scope.address.info = addressObj.shortaddress;
                        } else {
                            $scope.address.info = $scope.translateFilter('NO_ADDRESS');
                        }
                        $scope.address.position = latLngString;
                        $scope.mapModel.map.addControl($scope.hereControl);
                    }, (response) => {
                        orsMessagingService.messageSubject.onNext(lists.errors.GEOCODE);
                    });
                };
                $scope.locationsControl = () => {
                    return L.control.angular({
                        position: 'topright',
                        template: `
                     <a ng-click="show = !show" class="leaflet-locations">
                     </a>
                     <div ng-show="show" class="locations">
                        <div>
                            <div class="categories" ng-show="!showSubcategories">
                                <div class="c-nav">
                                    <div>
                                        <div>Locations</div>
                                    </div>
                                    <div>
                                        <div ng-click="clearLocations()">
                                                <i class="fa fa-trash"></i>
                                        </div>
                                        <div ng-click="show = !show">
                                            <i class="fa fa-remove"></i>
                                        </div>
                                    </div>
                                    
                                </div>
                                <div class="c-list">
                                    <div class="ui grid">
                                      <div class="four wide column category" ng-repeat="(category, obj) in categories" ng-click="toggleSubcategories(category)">
                                        <div tooltip-side="top" tooltip-template="{{(obj.name | translate)}}" tooltips="" ng-bind-html="categoryIcons[category]">
                                        </div>
                                        <div class="category-checkbox">
                                            <input type="checkbox" ng-model="obj.selected" ng-click="setSubcategories(category); $event.stopPropagation();" indeterminate/>
                                            <!--{{obj.selected}}-->    
                                        </div>
                                      </div>
                                    </div>
                                </div>
                            </div>
                            <div class="sub-categories" ng-show="showSubcategories">
                                <div class="sc-nav">
                                    <div ng-click="toggleSubcategories()">
                                        <i class="fa fa-lg fa-arrow-left"></i>
                                    </div>
                                    <div>
                                        <div class="ui compact menu">
                                          <div class="ui simple dropdown item">
                                            Categories
                                            <i class="dropdown icon"></i>
                                            <div class="menu">
                                              <div class="item" ng-repeat="(category, obj) in categories" ng-click="selectCategory(category);">{{obj.name}}</div>
                                            </div>
                                          </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="sc-list">
                                    <ul>
                                        <li ng-repeat="(scId, scObj) in categories[selectedCategoryId].subCategories">
                                            <div class="ui checkbox">
                                                <input id="{{scId}}" name="subcategory" ng-click="verifySubcategory(selectedCategoryId)" ng-model="scObj.selected" type="checkbox">
                                                    <label for="{{scId}}" ng-bind-html="(scObj.name | translate)">
                                                    </label>
                                                </input>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="search-input">
                           <div class="ui fluid action input">
                                <input ng-model="namefilter" placeholder="{{getPlaceholder()}}" select-on-click="" type="text">  
                                </input>
                                <div ng-class="{'ui primary button': !loading, 'ui primary loading button': loading, 'ui primary disabled button': disabled}" ng-click="callLocations();">Search</div>
                            </div>
                        </div>
                        <div class="result-list" ng-show="results.length > 0">
                             <div class="poi-header">
                                <div>
                                     <div ng-click="showResults = !showResults">
                                        <i ng-class="showResults ? 'fa fa-window-minimize' : 'fa fa-expand'"></i>
                                    </div>
                                </div>
                                <div>
                                    <div ng-bind-html="('DETAILS' | translate)"></div>
                                    <div ng-bind-html="'OSM'"></div>
                                </div>
                            </div>
                            <div class="poi-items" ng-show="showResults">
                                <div class="poi-item" ng-repeat="feature in results" ng-click="panTo(feature.geometry.coordinates);" ng-mouseout="DeEmphPoi();" ng-mouseover="EmphPoi(feature.geometry.coordinates, feature.properties.category);">
                                    <div class="poi-row">
                                        <div class="icon" ng-bind-html='categoryIcons[subcategoriesLookup[feature.properties.category]]'></div>
                                        <div class="text" ng-bind-html='feature.properties.name'></div>   
                                        <div class="icon pointer" ng-click="poiDetails = !poiDetails; $event.stopPropagation();" ng-show='feature.properties.address || feature.properties.phone || feature.properties.wheelchair || feature.properties.website'>
                                            <i ng-class="getClass(poiDetails)" >
                                            </i>
                                        </div>
                                        <div class="icon pointer">
                                            <a target="_blank" ng-href="{{makeUrl(feature.properties.osm_id)}}">
                                                <i class="fa fa-map">
                                                </i>
                                            </a> 
                                        </div>
                                    </div>                                  
                                    <div class="collapsable poi-details" ng-class="{ showMe: poiDetails }">    
                                        <div class="poi-row" ng-if="feature.properties.address">
                                            <div class="icon">
                                                <i class="fa fa-address-card"></i>
                                            </div>
                                            <div class="text">
                                                <span ng-if=feature.properties.address.street ng-bind-html="feature.properties.address.street + ', '"></span>
                                                <span ng-if=feature.properties.address.house_number ng-bind-html="feature.properties.address.house_number + ', '"></span>
                                                <span ng-if=feature.properties.address.postal_code ng-bind-html="feature.properties.address.postal_code + ', '"></span>
                                                <span ng-if=feature.properties.address.locality ng-bind-html="feature.properties.address.locality + ', '"></span>
                                                <span ng-if=feature.properties.address.region ng-bind-html="feature.properties.address.region + ', '"></span>
                                                <span ng-if=feature.properties.address.country ng-bind-html="feature.properties.address.country"></span>
                                            </div>                                        
                                        </div>
                                         <div class="poi-row" ng-if="feature.properties.phone">
                                            <div class="icon">
                                                <i class="fa fa-phone"></i>
                                            </div>
                                            <div class="text" ng-bind-html='feature.properties.phone'></div>                                        
                                        </div>
                                         <div class="poi-row" ng-if="feature.properties.website">
                                            <div class="icon">
                                                <i class="fa fa-globe"></i>
                                            </div> 
                                            <div class="text" ng-bind-html="feature.properties.website">
                                            </div>
                                        </div>
                                        <div class="poi-row" ng-if="feature.properties.wheelchair">
                                             <div ng-if="feature.properties.wheelchair">
                                                <i class="fa fa-wheelchair-alt"></i>
                                            </div>                                       
                                        </div> 
                                    </div> 
                                    
                                </div>
                            </div>     
                        </div>
                     </div>
                     `,
                        controllerAs: 'leaflet',
                        controller: function($scope, $element, $map, lists, orsUtilsService, orsLocationsService, $timeout) {
                            const lControl = angular.element(document.querySelector('.angular-control-leaflet'))
                                .addClass('leaflet-bar')[0];
                            if (!L.Browser.touch) {
                                L.DomEvent.disableClickPropagation(lControl)
                                    .disableScrollPropagation(lControl);
                            } else {
                                L.DomEvent.disableClickPropagation(lControl)
                                    .disableScrollPropagation(lControl);
                            }
                            $scope.getClass = (bool) => {
                                if (bool === true) return "fa fa-minus";
                                else return "fa fa-plus";
                            };
                            $scope.makeUrl = (osmId) => {
                                return "http://www.openstreetmap.org/node/" + osmId;
                            };
                            $scope.clearLocations = () => {
                                $scope.results = [];
                                orsLocationsService.clearLocationsToMap();
                            };
                            $scope.callLocations = () => {
                                $scope.loading = true;
                                let settings = {
                                    categories: [],
                                    subCategories: []
                                };
                                angular.forEach($scope.categories, function(cObj, index) {
                                    if (cObj.selected === true) {
                                        settings.categories.push(index);
                                    }
                                    if (cObj.selected.length === 0) {
                                        angular.forEach(cObj.subCategories, function(scObj, index) {
                                            console.log(scObj)
                                            if (scObj.selected) {
                                                console.log(index)
                                                settings.subCategories.push(index);
                                            }
                                        });
                                    }
                                });
                                if ($scope.namefilter && $scope.namefilter.length > 0) settings.nameFilter = $scope.namefilter;
                                settings.bbox = $map.getBounds()
                                    .toBBoxString();
                                orsLocationsService.clear();
                                const payload = orsUtilsService.locationsPayload(settings);
                                const request = orsLocationsService.fetchLocations(payload);
                                orsLocationsService.requests.push(request);
                                request.promise.then(function(response) {
                                    orsLocationsService.addLocationsToMap(response);
                                    $scope.results = response.features;
                                    $scope.showResults = true;
                                    $scope.loading = false;
                                }, function(response) {
                                    console.error(response);
                                    $scope.loading = false;
                                });
                            };
                            $scope.categoryIcons = lists.locations_icons;
                            $scope.getPlaceholder = () => {
                                // get set lang
                                return 'Optional filter, e.g. shell*';
                            };
                            $scope.selectCategory = (id) => {
                                $scope.selectedCategoryId = id;
                            };
                            $scope.verifySubcategory = (selectedCategoryId) => {
                                let cnt = 0;
                                angular.forEach($scope.categories[selectedCategoryId].subCategories, (subCategoryObj, subCategoryId) => {
                                    if (subCategoryObj.selected) cnt += 1;
                                });
                                const scLength = Object.keys($scope.categories[selectedCategoryId].subCategories)
                                    .length;
                                if (cnt == scLength) {
                                    $scope.categories[selectedCategoryId].selected = true;
                                    $scope.isIntermediate = false;
                                } else if (cnt > 0 && cnt < scLength) {
                                    $scope.categories[selectedCategoryId].selected = '';
                                    $scope.isIntermediate = true;
                                } else {
                                    $scope.categories[selectedCategoryId].selected = false;
                                    $scope.isIntermediate = false;
                                }
                                // wait for intermediate directive to execute, next cycle
                                $timeout(function() {
                                    $scope.isAnySelected();
                                }, 0);
                            };
                            $scope.setSubcategories = function(categoryId) {
                                angular.forEach($scope.categories[categoryId].subCategories, (subCategoryObj, subCategoryId) => {
                                    if ($scope.isIntermediate) {
                                        subCategoryObj.selected = false;
                                    } else {
                                        subCategoryObj.selected = $scope.categories[categoryId].selected;
                                    }
                                });
                                $scope.isIntermediate = false;
                                // wait for intermediate directive to execute, next cycle
                                $timeout(function() {
                                    $scope.isAnySelected();
                                }, 0);
                            };
                            //10 seconds delay
                            $scope.isAnySelected = () => {
                                let active = false;
                                angular.forEach($scope.categories, (categoryObj, categoryName) => {
                                    if (categoryObj.selected || categoryObj.selected.length === 0) {
                                        active = true;
                                    }
                                });
                                if (active) $scope.disabled = false;
                                else $scope.disabled = true;
                            };
                            $scope.toggleSubcategories = function(categoryId) {
                                if (categoryId) $scope.selectedCategoryId = categoryId;
                                $scope.showSubcategories = $scope.showSubcategories === true ? false : true;
                            };
                            $scope.EmphPoi = (geometry, category) => {
                                if ($map.getZoom() >= 14) orsLocationsService.emphPoi(geometry, category);
                            };
                            $scope.DeEmphPoi = () => {
                                orsLocationsService.DeEmphPoi();
                            };
                            $scope.panTo = (geometry) => {
                                orsLocationsService.panTo(geometry);
                            };
                            $scope.onInit = () => {
                                $scope.loading = true;
                                const payload = orsUtilsService.locationsCategoryPayload();
                                const request = orsLocationsService.fetchLocations(payload);
                                request.promise.then(function(response) {
                                    // intermediate state is needed as we are using a tri-state checkbox
                                    $scope.loading = $scope.showSubcategories = $scope.isIntermediate = false;
                                    $scope.show = $scope.disabled = true;
                                    $scope.categories = {};
                                    $scope.subcategoriesLookup = {};
                                    angular.forEach(response.categories, (categoryObj, categoryName) => {
                                        let subCategories = {};
                                        angular.forEach(categoryObj.values, (subCategoryId, subCategoryName) => {
                                            $scope.subcategoriesLookup[subCategoryId] = categoryObj.id;
                                            subCategories[subCategoryId] = {
                                                name: subCategoryName,
                                                selected: false,
                                            };
                                        });
                                        $scope.categories[categoryObj.id] = {
                                            name: categoryName,
                                            selected: false,
                                            subCategories: subCategories
                                        };
                                    });
                                    orsLocationsService.setSubcategoriesLookup($scope.subcategoriesLookup);
                                }, function(response) {
                                    console.error(response);
                                    $scope.loading = false;
                                });
                            };
                            $scope.onInit();
                        }
                    });
                };
                // add locations control
                $scope.mapModel.map.addControl($scope.locationsControl());
                /**
                 * Dispatches all commands sent by Mapservice by using id and then performing the corresponding function
                 */
                orsMapFactory.subscribeToMapFunctions(function onNext(params) {
                    switch (params._actionCode) {
                        case -1:
                            $scope.hg.options.expand = globals.showHeightgraph;
                            $scope.mapModel.map.addControl($scope.hg);
                            const toggle = angular.element(document.querySelector('.heightgraph-toggle-icon'));
                            const close = angular.element(document.querySelector('.heightgraph-close-icon'));
                            toggle.bind('click', function(e) {
                                globals.showHeightgraph = true;
                            });
                            close.bind('click', function(e) {
                                globals.showHeightgraph = false;
                            });
                            if (params._package.geometry) {
                                $scope.hg.addData(params._package.geometry);
                                if (globals.showHeightgraph) globals.showHeightgraph = true;
                            } else {
                                $scope.hg.remove();
                            }
                            break;
                            /** zoom to features */
                        case 0:
                            $scope.zoom(params._package);
                            break;
                            /** add features */
                        case 1:
                            $scope.addFeatures(params._package);
                            break;
                        case 2:
                            $scope.clear(params._package);
                            break;
                        case 3:
                            $scope.highlightWaypoint(params._package);
                            break;
                        case 5:
                            $scope.clearMap();
                            break;
                        case 7:
                            $scope.clearFeaturegroup(params._package);
                            break;
                        case 10:
                            $scope.addLocations(params._package);
                            break;
                        case 11:
                            $scope.highlightPoi(params._package);
                            break;
                        case 30:
                            $scope.addIsochrones(params._package);
                            break;
                        case 31:
                            $scope.toggleIsochrones(params._package);
                            break;
                        case 32:
                            $scope.toggleIsochroneIntervals(params._package);
                            break;
                        case 33:
                            $scope.reshuffleIndicesText(params._package);
                            break;
                        case 34:
                            $scope.addIsochronesMarker(params._package);
                            break;
                        case 35:
                            $scope.removeIsochrones(params._package);
                            break;
                        case 36:
                            $scope.toggleIsochronesMarker(params._package);
                            break;
                        case 40:
                            $scope.addPolyline(params._package);
                            break;
                        case 41:
                            $scope.addPolylineHover(params._package);
                        default:
                            break;
                    }
                });
            }]
        };
    });
// directive to control the popup to add waypoints on the map
angular.module('orsApp')
    .directive('orsPopup', ['$compile', '$timeout', 'orsSettingsFactory', 'orsUtilsService', 'orsRequestService', 'orsRouteService', ($compile, $timeout, orsSettingsFactory, orsUtilsService, orsRequestService, orsRouteService) => {
        return {
            restrict: 'E',
            templateUrl: 'components/ors-map/directive-templates/ors-popup.html',
            link: (scope, elem, attr) => {
                scope.add = (idx) => {
                    scope.processMapWaypoint(idx, scope.displayPos);
                };
                //what's here request
                scope.here = () => {
                    scope.showHereMessage(scope.displayPos);
                };
            }
        };
    }]);
angular.module('orsApp')
    .directive('orsAaPopup', ['$compile', '$timeout', 'orsSettingsFactory', ($compile, $timeout, orsSettingsFactory) => {
        return {
            restrict: 'E',
            templateUrl: 'components/ors-map/directive-templates/ors-aa-popup.html',
            link: (scope, elem, attr) => {
                scope.add = (idx) => {
                    //fourth argument to not fire a request on add waypoint
                    scope.processMapWaypoint(idx, scope.displayPos, false, false);
                };
            }
        };
    }]);
angular.module('orsApp')
    .directive('orsHerePopup', ['$translate', ($translate) => {
        return {
            restrict: 'E',
            templateUrl: 'components/ors-map/directive-templates/ors-here-popup.html',
            link: (scope, elem, attr) => {
                scope.hereShow = true;
            }
        };
    }]);
angular.module('orsApp')
    .directive('orsRoutePointPopup', ['$translate', ($translate) => {
        return {
            restrict: 'E',
            templateUrl: 'components/ors-map/directive-templates/ors-route-point-popup.html',
            link: (scope, elem, attr) => {}
        };
    }]);
angular.module('orsApp')
    .directive('orsWelcomeBox', ['$translate', ($translate) => {
        return {
            restrict: 'E',
            template: `<div ng-attr-class="{{ 'ui message ors-map-message fade blue' }}" ng-show="show">
            <i class="fa fa-close flright" data-ng-click="show = !show"></i>
            <div class="header" ng-bind-html="('WELCOME' | translate)">
            </div>
            <div class="list">
                <span ng-bind-html="('WELCOME_MESSAGE' | translate)">
                </span>
            </div>
        </div>`,
            link: (scope, elem, attr) => {
                scope.show = true;
            }
        };
    }]);
angular.module('orsApp')
    .directive('orsSignupBox', ['$translate', ($translate) => {
        return {
            restrict: 'E',
            template: `<div ng-attr-class="{{ 'ui message ors-map-message fade green' }}" ng-show="show">
            <i class="fa fa-close flright" data-ng-click="show = !show"></i>
            <div class="header" ng-bind-html="('LOCALE_SIGNUP_HEADER' | translate)">
            </div>
            <div class="list">
                <span ng-bind-html="('LOCALE_SIGNUP_MESSAGE' | translate)">
                </span>
            </div>
        </div>`,
            link: (scope, elem, attr) => {
                scope.show = true;
            }
        };
    }]);