(function () {
    'use strict';

    angular.module('moras.auth.service', ['moras.config', 'firebase'])
        .factory('AuthService', ['FB_URI',
            function (FB_URI) {
                console.log('AS: Starting');

                var ref = new Firebase(FB_URI);

                var auth = {
                    authed: false,
                    data: {}
                };

                var object = {};

                object.isAuthenticated = function () {
                    return auth.authed;
                };

                object.getAuth = function () {
                    return angular.copy(auth);
                };

                ref.onAuth(function (authData) {
                    if (authData) {
                        console.log('AS: Auth data found. User is logged in.');

                        // HAX
                        // if (this.loginForm && this.loginForm.newUser) {
                        //     this.rootRef.child('users').child(authData.uid).set({
                        //         email: authData.password.email
                        //     }, function(error) {
                        //         if (error) {
                        //             console.log('AS: Could not create user data in FB: %o', error);
                        //         }
                        //         else {
                        //             console.log('AS: Successfully created user data.');
                        //         }
                        //     });
                        // }

                        auth.authed = true;
                        auth.data = authData;
                    } else {
                        console.log('AS: Auth data not found. User is not logged in.');
                        auth.authed = false;
                        auth.data = {};
                    }
                });

                var doCallback = function (callbackFn, callbackObj) {
                    if (callbackFn && typeof callbackFn === 'function') {
                        if (callbackObj && typeof callbackObj === 'object') {
                            callbackFn.apply(callbackObj);
                        } else {
                            callbackFn();
                        }
                    }
                };

                object.createUser = function (credentials) {
                    console.log('AS: Creating user with: %o', credentials);
                    ref.createUser({
                        email: credentials.email,
                        password: credentials.password
                    }, function (error) {
                        if (error) {
                            switch (error.code) {
                            case 'EMAIL_TAKEN':
                                console.log('AS: Error creating user. Email taken: ' + credentials.email);
                                break;
                            case 'INVALID_EMAIL':
                                console.log('AS: Error creating user. Invalid email: ' + credentials.email);
                                break;
                            default:
                                console.log('AS: Error creating user. Unknown error: %o', error);
                            }
                        } else {
                            console.log('AS: User successfully created: ' + credentials.email);
                        }
                    });
                };

                object.login = function (credentials, callbackFn, callbackObj) {
                    console.log('AS: Loging in with: %o', credentials);
                    ref.authWithPassword({
                        email: credentials.email,
                        password: credentials.password
                    }, function (error, authData) {
                        if (error) {
                            console.log('AS: Error logging in. Unknown error: %o', error);
                        } else {
                            console.log('AS: User successfully logged in: %o', authData);
                            auth.authed = true;
                            auth.authData = authData;
                        }
                        doCallback(callbackFn, callbackObj);
                    }, {
                        remember: false
                    });
                };

                object.logout = function () {
                    console.log('AS: Logging out. See you soon!');
                    ref.unauth();
                    auth.authed = false;
                    auth.authData = {};
                };

                return object;
            }
        ]);

}());