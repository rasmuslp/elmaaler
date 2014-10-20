(function() {
    'use strict';

    angular.module('moras.auth.controller', ['moras.auth.service'])
        .controller('AuthController', ['AuthService',
            function(AuthService) {
                this.authError = false;

                this.authed = function() {
                    return AuthService.authed;
                };

                this.createUser = function() {
                    AuthService.createUser(this.credentials);
                    this.credentials = {};
                };

                this.login = function() {
                    var self = this;
                    AuthService.login(angular.copy(this.credentials), function(error) {
                        if (!error) {
                            self.credentials = {};
                            self.authError = false;
                        } else {
                            self.authError = error.message;
                        }
                    });
                };

                this.logout = function() {
                    AuthService.logout();
                };
            }
        ]);

}());