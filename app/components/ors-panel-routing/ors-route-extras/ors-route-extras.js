angular.module('orsApp.ors-route-extras', ['orsApp.ors-bars-chart','orsApp.ors-route-extras-map'])
    .component('orsRouteExtras', {
        templateUrl: 'components/ors-panel-routing/ors-route-extras/ors-route-extras.html',
        bindings: {
            currentRoute: '<',
            routeIndex: '<'
        },
        controller: ['$scope', 'mappings', 'orsRouteService', function($scope, mappings, orsRouteService) {
            let ctrl = this;
            ctrl.extrasCheck = [];
            ctrl.mappings = mappings;
            ctrl.processExtras = (currentRoute, key) => {
                let totalDistance = currentRoute.summary.distance;
                let extras = {};
                angular.forEach(currentRoute.extras[key].values, function(elem, i) {
                    const fr = elem[0],
                        to = elem[1];
                    if (fr !== to) {
                        const typeNumber = parseInt(elem[2]);
                        const routeSegment = currentRoute.geometry.slice(fr, to);
                        if (typeNumber in extras) {
                            extras[typeNumber].intervals.push([fr, to]);
                        } else {
                            let text = ctrl.mappings[key][typeNumber].text;
                            let color = ctrl.mappings[key][typeNumber].color;
                            extras[typeNumber] = {
                                type: text,
                                intervals: [
                                    [fr, to]
                                ],
                                color: color
                            };
                        }
                    }
                });
                let y0 = 0;
                let typesOrder = [];
                // sort by value to maintain color ordering
                currentRoute.extras[key].summary.sort(function(a, b) {
                    return parseFloat(a.value) - parseFloat(b.value);
                });
                for (let i = 0; i < currentRoute.extras[key].summary.length; i++) {
                    const extra = currentRoute.extras[key].summary[i];
                    extras[extra.value].distance = extra.distance;
                    extras[extra.value].percentage = extra.amount;
                    extras[extra.value].y0 = y0;
                    extras[extra.value].y1 = y0 += +extra.amount;
                    typesOrder.push(extra.value);
                }
                return {
                    extras: extras,
                    typesOrder: typesOrder
                };
            };
            // ctrl.extrasCheck = [];
            // ctrl.changeColor = (i) => {
            //     orsRouteService.DeColor();
            //     // only one checkbox allowed at a time
            //     if (ctrl.extrasCheck[i]) {
            //         for (let val = 0; val < ctrl.extrasCheck.length; val++) {
            //             if (val != i) {
            //                 ctrl.extrasCheck[val] = false;
            //             }
            //         }
            //         angular.forEach(ctrl.routeExtras[i].data, function(value,key){
            //             const color = value.color;
            //             angular.forEach(ctrl.routeExtras[i].data[key].intervals, function(v,k){
            //                 const geom = ctrl.currentRoute.geometry.slice(v[0],v[1]+1);

            //                 orsRouteService.Color(geom, color);
            //             });
            //         });
            //     }
            //     else {
            //         orsRouteService.DeColor();
            //     }
            // };
            ctrl.routeExtras = [];
            $scope.$watch('$ctrl.currentRoute', (route) => {
                ctrl.routeExtras = [];
                for (let key in route.extras) {
                    const data = ctrl.processExtras(route, key);
                    ctrl.routeExtras.push({
                        data: data.extras,
                        typesOrder: data.typesOrder,
                        type: key,
                        routeIndex: ctrl.routeIndex
                    });
                }
                //ctrl.routeExtras = angular.copy(ctrl.routeExtras);
            });
        }]
    });