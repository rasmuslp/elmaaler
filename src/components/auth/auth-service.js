(function() {
    'use strict';

    angular.module('moras.auth.service', ['moras.config', 'firebase'])
        .factory('AuthService', ['FB_URI', '$firebase',
            function(FB_URI) {
                var ref = new Firebase(FB_URI);
                var object = {};

                object.authed = false;

                object.createUser = function(credentials) {
                    console.log('Creating user with: %o', credentials);
                    ref.createUser({
                        email: credentials.email,
                        password: credentials.password
                    }, function(error) {
                        if (error) {
                            switch (error.code) {
                                case 'EMAIL_TAKEN':
                                    console.log('Error creating user. Email taken: ' + credentials.email);
                                    break;
                                case 'INVALID_EMAIL':
                                    console.log('Error creating user. Invalid email: ' + credentials.email);
                                    break;
                                default:
                                    console.log('Error creating user. Unknown error: %o', error);
                            }
                        }
                        else {
                            console.log('User successfully created: ' + credentials.email);
                        }
                    });
                };

                object.login = function(credentials, callback) {
                    console.log('Loging in with: %o', credentials);
                    ref.authWithPassword({
                        email: credentials.email,
                        password: credentials.password
                    }, function(error, authData) {
                        if (error) {
                            console.log('Error logging in. Unknown error: %o', error);
                        }
                        else {
                            console.log('User successfully logged in: %o', authData);
                            object.authed = true;
                        }
                        if (callback && typeof(callback) === 'function') {
                            callback(error);
                        }
                    }, {
                        remember: false
                    });
                };

                object.logout = function() {
                    console.log('Logging out. See you soon!');
                    ref.unauth();
                    object.authed = false;
                };

                return object;
            }
        ]);

}());