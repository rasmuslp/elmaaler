'use strict';

(function() {
    angular.module('aware.dashboard.data.service', ['moras.config', 'firebase'])
        .factory('DataService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var data;

                var ret = {};

                ret.setup = function(device, key) {
                    var ref = new Firebase(FB_URI + 'device/' + device + '/' + '/data/' + key + '/raw');
                    data = $firebase(ref).$asArray();
                };

                ret.data = function() {
                    return data;
                };

                ret.destroy = function() {
                    data.$destroy();
                };

                return ret;
            }
        ]);
}());