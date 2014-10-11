(function() {
    'use strict';

    angular.module('moras.auth.controller', ['moras.auth.service'])
        .controller('AuthController', ['AuthService',
            function(AuthService) {
                this.createUser = function() {
                    AuthService.createUser(this.credentials);
                    this.credentials = {};
                };

                this.login = function() {
                    AuthService.login(angular.copy(this.credentials));
                    this.credentials = {};
                };

                this.logout = function() {
                    AuthService.logout();
                };
            }
        ]);

}());