(function() {
    'use strict';

    angular.module('aware.dashboard.data.service', ['moras.config', 'firebase'])
        .factory('DataService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var data;

                var ret = {};

                ret.setup = function(key) {
                    var ref = new Firebase(FB_URI + 'data/' + key + '/');
                    data = $firebase(ref).$asObject();
                };

                ret.get = function() {
                    return data;
                };

                ret.destroy = function() {
                    data.$destroy();
                };

                return ret;
            }
        ]);
}());