angular.module('orsApp.route-service', [])
    .factory('orsRouteService', ['$q', '$http', 'orsUtilsService', 'orsMapFactory', 'orsObjectsFactory', 'lists', 'ENV', ($q, $http, orsUtilsService, orsMapFactory, orsObjectsFactory, lists, ENV) => {
        /**
         * Requests geocoding from ORS backend
         * @param {String} requestData: XML for request payload
         */
        let orsRouteService = {};
        orsRouteService.routesSubject = new Rx.BehaviorSubject({});
        orsRouteService.resetRoute = () => {
            orsRouteService.routeObj = {};
            orsRouteService.routesSubject.onNext([]);
            let action = orsObjectsFactory.createMapAction(2, lists.layers[1], undefined, undefined);
            orsMapFactory.mapServiceSubject.onNext(action);
            orsRouteService.DeColor();
        };
        orsRouteService.routingRequests = {};
        orsRouteService.routingRequests.requests = [];
        orsRouteService.routingRequests.clear = () => {
            for (let req of orsRouteService.routingRequests.requests) {
                if ('cancel' in req) req.cancel("Cancel last request");
            }
            orsRouteService.routingRequests.requests = [];
        };
        /**
         * Requests route from ORS backend
         * @param {String} requestData: XML for request payload
         */
        orsRouteService.fetchRoute = (requestData) => {
            var url = ENV.routing;
            var canceller = $q.defer();
            var cancel = (reason) => {
                canceller.resolve(reason);
            };
            var promise = $http.get(url, {
                    params: requestData,
                    timeout: canceller.promise
                })
                .then((response) => {
                    return response.data;
                });
            return {
                promise: promise,
                cancel: cancel
            };
        };
        orsRouteService.setCurrentRouteIdx = (idx) => {
            orsRouteService.currentRouteIdx = idx;
        };
        orsRouteService.getCurrentRouteIdx = () => {
            return orsRouteService.currentRouteIdx;
        };
        orsRouteService.DeEmph = () => {
            let action = orsObjectsFactory.createMapAction(2, lists.layers[2], undefined, undefined);
            orsMapFactory.mapServiceSubject.onNext(action);
        };
        orsRouteService.DeColor = () => {
            let action = orsObjectsFactory.createMapAction(2, lists.layers[7], undefined, undefined);
            orsMapFactory.mapServiceSubject.onNext(action);
        };
        orsRouteService.Emph = (geom) => {
            let action = orsObjectsFactory.createMapAction(1, lists.layers[2], geom, undefined, lists.layerStyles.routeEmph());
            orsMapFactory.mapServiceSubject.onNext(action);
        };
        orsRouteService.Color = (geom, color) => {
            let style = lists.layerStyles.getStyle(color, 6, 1);
            let action = orsObjectsFactory.createMapAction(1, lists.layers[7], geom, undefined, style);
            orsMapFactory.mapServiceSubject.onNext(action);
        };
        orsRouteService.zoomTo = (geom) => {
            let action = orsObjectsFactory.createMapAction(0, lists.layers[2], geom, undefined);
            orsMapFactory.mapServiceSubject.onNext(action);
        };
        orsRouteService.addRoute = (route, focusIdx) => {
            const routePadding = orsObjectsFactory.createMapAction(1, lists.layers[1], route.geometry, undefined, lists.layerStyles.routePadding());
            orsMapFactory.mapServiceSubject.onNext(routePadding);
            const routeLine = orsObjectsFactory.createMapAction(40, lists.layers[1], route.geometry, undefined, lists.layerStyles.route(), {
                pointInformation: route.point_information
            });
            orsMapFactory.mapServiceSubject.onNext(routeLine);
            if (focusIdx) {
                const zoomTo = orsObjectsFactory.createMapAction(0, lists.layers[1], route.geometry, undefined, undefined);
                orsMapFactory.mapServiceSubject.onNext(zoomTo);
            }
        };
        orsRouteService.addHeightgraph = (geometry) => {
            console.log(geometry)
            const heightgraph = orsObjectsFactory.createMapAction(-1, undefined, geometry, undefined, undefined);
            orsMapFactory.mapServiceSubject.onNext(heightgraph);
        };
        orsRouteService.removeHeightgraph = () => {
            const heightgraph = orsObjectsFactory.createMapAction(-1, undefined, undefined, undefined, undefined);
            orsMapFactory.mapServiceSubject.onNext(heightgraph);
        };
        orsRouteService.calculateDistance = (lat1, lon1, lat2, lon2) => { // generally used geo measurement function
            var R = 6371; // 8.137; // Radius of earth in KM // Turf uses 6373.0
            var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
            var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c;
            return d * 1000; // meters
        };
        /** prepare route to json */
        orsRouteService.processResponse = (data, profile, focusIdx) => {
            orsRouteService.data = data;
            let cnt = 0;
            angular.forEach(orsRouteService.data.routes, function(route) {
                console.error(route)
                //const geometry = orsUtilsService.decodePolyline(route.geometry, route.elevation);
                route.geometryRaw = angular.copy(route.geometry.coordinates);
                let geometry = route.geometry.coordinates;
                // reverse order, needed as leaflet ISO 6709
                for (let i = 0; i < geometry.length; i++) {
                    let lng = geometry[i][0];
                    let lat = geometry[i][1];
                    geometry[i][0] = lat;
                    geometry[i][1] = lng;
                }
                route.geometry = geometry;
                route.point_information = orsRouteService.processPointExtras(route);
                if (cnt == 0) {
                    if (route.elevation) {
                        // get max and min elevation from nested array
                        // var values = actionPackage.geometry.map(function(elt) {
                        //     return elt[2];
                        // });
                        // var max = Math.max.apply(null, values);
                        // var min = Math.min.apply(null, values);
                        // process heightgraph data
                        const hgGeojson = orsRouteService.processHeightgraphData(route);
                        orsRouteService.addHeightgraph(hgGeojson);
                    } else {
                        orsRouteService.removeHeightgraph();
                    }
                    orsRouteService.addRoute(route, focusIdx);
                }
                cnt += 1;
            });
            orsRouteService.routesSubject.onNext(orsRouteService.data);
        };
        /** process point information */
        orsRouteService.processPointExtras = (route) => {
            const generateHeightInfo = (geometry, idx) => {
                const obj = {};
                obj.height = parseFloat(geometry[idx][2].toFixed(1));
                if (idx > 0) {
                    let last_z = geometry[(idx - 1)][2];
                    if (obj.height < last_z) {
                        let minus = last_z - obj.height;
                        descent += minus;
                    } else if (obj.height > last_z) {
                        let plus = obj.height - last_z;
                        ascent += plus;
                    }
                    if (ascent > 0) {
                        obj.ascent = parseFloat(ascent.toFixed(1));
                    }
                    if (descent > 0) {
                        obj.descent = parseFloat(descent.toFixed(1));
                    }
                }
                return obj;
            };
            const fetchExtrasAtPoint = (extrasObj, idx) => {
                const extrasAtPoint = {};
                angular.forEach(extrasObj, function(values, key) {
                    extrasAtPoint[key] = values[idx];
                });
                return extrasAtPoint;
            };
            // prepare extras object
            let extrasObj = {};
            (extrasObj = () => {
                angular.forEach(route.extras, function(val, key) {
                    const list = [];
                    angular.forEach(val.values, function(extraList, keyIdx) {
                        for (let start = extraList[0]; start < extraList[1]; start++) {
                            list.push(extraList[2]);
                        }
                    });
                    // push last extra, not considered in above loop
                    list.push(val.values[val.values.length - 1][2]);
                    extrasObj[key] = list;
                });
            })();
            const info_array = [];
            const geometry = route.geometry;
            const segments = route.segments;
            // declare cumulative statistic variables
            let descent = ascent = distance = segment_distance = step_distance = point_distance = 0;
            // declare incrementing ids
            let segment_id = step_id = point_id = 0;
            // loop the geometry and calculate distances
            for (let i = 0; i < geometry.length; i++) {
                const lat = geometry[i][0];
                const lng = geometry[i][1];
                // store the segment_id of the point and reset the step_id
                if (i > route.way_points[segment_id + 1]) {
                    segment_id += 1;
                    step_id = 0;
                }
                if (i > 0) {
                    let last_lat = geometry[i - 1][0];
                    let last_lng = geometry[i - 1][1];
                    // calculate point distance to last point in meters
                    point_distance = turf.distance(orsObjectsFactory.createPoint(last_lat, last_lng), orsObjectsFactory.createPoint(lat, lng)) * 1000;
                    // add to to the step distance
                    step_distance += point_distance;
                    segment_distance += point_distance;
                    distance += point_distance;
                }
                // if last point of a step is reached
                if (i == segments[segment_id].steps[step_id].way_points[1]) {
                    segments[segment_id].steps[step_id].distanceTurf = parseFloat(step_distance.toFixed(1)); // this would override steps distance with turf value
                    step_id += 1;
                    step_distance = 0;
                }
                // advances to next route segment
                if (i == route.way_points[segment_id + 1]) {
                    segment_id += 1;
                    segment_distance = 0;
                    step_id = 0;
                    point_id = 0;
                }
                const pointobject = {
                    coords: [lat, lng],
                    extras: fetchExtrasAtPoint(extrasObj, i),
                    distance: parseFloat(distance.toFixed(1)),
                    // duration: null, // todo
                    segment_index: segment_id,
                    point_id: i,
                    heights: route.elevation && generateHeightInfo(geometry, i)
                };
                point_id += 1;
                info_array.push(pointobject);
            }
            return info_array;
        };
        /* process heightgraph geojson object */
        orsRouteService.processHeightgraphData = (route) => {
            const routeString = route.geometryRaw;
            let hgData = [];
            for (let key in route.extras) {
                let extra = [];
                if (key !== 'waycategory') {
                    for (let item of route.extras[key].values) {
                        let chunk = {};
                        const from = item[0];
                        const to = item[1];
                        const geometry = routeString.slice(from, to + 1);
                        chunk.line = geometry;
                        const typenumber = item[2];
                        chunk.attributeType = typenumber;
                        extra.push(chunk);
                    }
                    extra = GeoJSON.parse(extra, {
                        LineString: 'line',
                        extraGlobal: {
                            'Creator': 'OpenRouteService.org',
                            'records': extra.length,
                            'summary': key
                        }
                    });
                    hgData.push(extra);
                }
            }
            return hgData;
        };
        return orsRouteService;
    }]);