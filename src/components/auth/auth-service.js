(function() {
    'use strict';

    angular.module('moras.auth.service', ['moras.config', 'firebase'])
        .factory('AuthService', ['FB_URI', '$firebase', '$timeout',
            function(FB_URI, $firebase, $timeout) {
                var ref = new Firebase(FB_URI);

                var object = {};
                object.authed = false;
                object.authData = {};

                ref.onAuth(function(authData) {
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

                        object.authed = true;
                        object.authData = authData;
                    }
                    else {
                        console.log('AS: Auth data not found. User is not logged in.');
                        object.authed = false;
                        object.authData = {};
                    }
                });

                object.waitForAuth = function(callback, callbackObject) {
                    console.log('AS: Waiting for auth...');
                    if (callback && typeof callback === 'function') {
                        if (object.authed) {
                            console.log('AS: Waiting for auth... done. Calling back.');
                            if (callbackObject && typeof callbackObject === 'object') {
                                callback.apply(callbackObject);
                            }
                            else {
                                callback();
                            }
                        }
                        else {
                            console.log('AS: Waiting for auth... still not authed.');
                            $timeout(function() {
                                object.waitForAuth(callback, callbackObject);
                            }, 100);
                        }
                    }
                };

                object.createUser = function(credentials) {
                    console.log('AS: Creating user with: %o', credentials);
                    ref.createUser({
                        email: credentials.email,
                        password: credentials.password
                    }, function(error) {
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
                        }
                        else {
                            console.log('AS: User successfully created: ' + credentials.email);
                        }
                    });
                };

                object.login = function(credentials, callback) {
                    console.log('AS: Loging in with: %o', credentials);
                    ref.authWithPassword({
                        email: credentials.email,
                        password: credentials.password
                    }, function(error, authData) {
                        if (error) {
                            console.log('AS: Error logging in. Unknown error: %o', error);
                        }
                        else {
                            console.log('AS: User successfully logged in: %o', authData);
                            object.authed = true;
                            object.authData = authData;
                        }
                        if (callback && typeof(callback) === 'function') {
                            callback(error);
                        }
                    }, {
                        remember: false
                    });
                };

                object.logout = function() {
                    console.log('AS: Logging out. See you soon!');
                    ref.unauth();
                    object.authed = false;
                    object.authData = {};
                };

                return object;
            }
        ]);

}());