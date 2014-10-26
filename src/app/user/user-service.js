(function () {
    'use strict';

    angular.module('aware.user.service', ['moras.auth'])
        .factory('UserService', ['AuthService', 'FB_URI',
            function (AuthService, FB_URI) {
                var ref = new Firebase(FB_URI);

                var object = {
                    user: {}
                };

                var doCallback = function (callbackFn, callbackObj) {
                    if (callbackFn && typeof callbackFn === 'function') {
                        if (callbackObj && typeof callbackObj === 'object') {
                            callbackFn.apply(callbackObj);
                        } else {
                            callbackFn();
                        }
                    }
                };

                object.load = function (callbackFn, callbackObj) {
                    console.log('US: Load');
                    var userRef = ref.child('users').child(AuthService.getAuth().data.uid);
                    userRef.on('value', function (snapshot) {
                        console.log('US: Got data');
                        object.user = snapshot.val();
                        doCallback(callbackFn, callbackObj);
                    });
                };

                return object;
            }
        ]);

}());