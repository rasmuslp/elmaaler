(function() {
    'use strict';

    angular.module('aware.dashboard.devices.service', ['moras.config', 'firebase'])
        .factory('DevicesService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var data;

                var ret = {};

                ret.setup = function(key) {
                    var ref = new Firebase(FB_URI + 'devices/' + key + '/');
                    data = $firebase(ref).$asArray();
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