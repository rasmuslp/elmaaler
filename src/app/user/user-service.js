(function() {
    'use strict';

    angular.module('aware.user.service', ['moras.auth'])
        .factory('UserService', ['AuthService', 'FB_URI', '$firebase',
            function(AuthService, FB_URI) {
                var ref = new Firebase(FB_URI);
                var object = {};

                object.user = {};

                object.load = function(callback, callbackObject) {
                    console.log('US: Load');

                    AuthService.waitForAuth(function() {
                        var userRef = ref.child('users').child(AuthService.authData.uid);
                        userRef.on('value', function(snapshot) {
                            console.log('US: Got data');
                            object.user = snapshot.val();
                            if (callback && typeof callback === 'function') {
                                if (callbackObject && typeof callbackObject === 'object') {
                                    callback.apply(callbackObject);
                                }
                                else {
                                    callback();
                                }
                            }
                        });
                    }, this);
                };

                return object;
            }
        ]);

}());