(function() {
    'use strict';

    angular.module('aware.dashboard.messages.service', ['moras.config', 'firebase'])
        .factory('MessagesService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var data;

                var ret = {};

                ret.setup = function(key) {
                    var ref = new Firebase(FB_URI + 'messagesFromBlinkies/' + key + '/');
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