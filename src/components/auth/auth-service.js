(function() {
    'use strict';

    angular.module('moras.auth.service', ['moras.config', 'firebase'])
        .factory('AuthService', ['FB_URI', '$firebase',
            function(FB_URI, $firebase) {
                var ref = new Firebase(FB_URI);
                var ret = {};

                ret.createUser = function(credentials) {
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

                ret.login = function(credentials) {
                    console.log('Loging in with: %o', credentials);
                    ref.authWithPassword({
                        email: credentials.email,
                        password: credentials.password
                    }, function(error, authData) {
                        if (error) {
                            console.log('Error loging in. Unknown error: %o', error);
                        }
                        else {
                            console.log('User successfully logged in: %o', authData);
                        }
                    }, {
                        remember: false
                    });
                };

                ret.logout = function() {
                    ref.unauth();
                };

                return ret;
            }
        ]);

}());