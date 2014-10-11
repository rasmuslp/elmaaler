(function() {
    'use strict';

    angular.module('aware.dashboard.datameta.service', ['moras.config', 'firebase'])
        .factory('DatametaService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var data;

                var ret = {};

                ret.setup = function(device) {
                    var ref = new Firebase(FB_URI + 'device/' + device + '/' + '/dataMeta');
                    data = $firebase(ref).$asArray();
                };

                ret.data = function() {
                    return data;
                };

                return ret;
            }
        ]);
}());