(function () {
    'use strict';

    angular.module('moras.auth.controller', ['moras.auth.service'])
        .controller('AuthController', ['AuthService',
            function (AuthService) {
                this.authError = false;

                this.isAuthenticated = AuthService.isAuthenticated;

                this.createUser = function () {
                    AuthService.createUser(this.credentials);
                    this.credentials = {};
                };

                this.login = function () {
                    AuthService.login(angular.copy(this.credentials), function (error) {
                        if (!error) {
                            this.credentials = {};
                            this.authError = false;
                        } else {
                            this.authError = error.message;
                        }
                    }, this);
                };

                this.logout = function () {
                    AuthService.logout();
                };
            }
        ]);

}());