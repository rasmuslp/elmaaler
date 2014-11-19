(function () {
    'use strict';
    var awareApp = angular.module('awareApp', ['admin-controller', 'dashboard-controller', 'firebase', 'ui.router', 'n3-line-chart']);

    // let's create a re-usable factory that generates the $firebaseAuth instance
    awareApp.factory('Auth', ['$firebaseAuth', function ($firebaseAuth) {
        var ref = new Firebase('https://elmaaler.firebaseio.com');
        return $firebaseAuth(ref);
    }]);

    awareApp.run(['$rootScope', '$state', function ($rootScope, $state) {
        $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
            // We can catch the error thrown when the $requireAuth promise is rejected
            // and redirect the user back to the home page
            if (error === 'AUTH_REQUIRED') {
                $state.go('login');
            }
        });
    }]);

    awareApp.config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: 'app/home/home.tpl.html'
            })
            .state('dashboard', {
                url: '/dashboard',
                templateUrl: 'app/dashboard/dashboard.tpl.html',
                controller: 'DashboardController as dashboardCtrl',
                resolve: {
                    'currentAuth': ['Auth', function (Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            })
            .state('admin', {
                url: '/admin',
                templateUrl: 'app/admin/admin.tpl.html',
                controller: 'AdminController as adminCtrl',
                resolve: {
                    'currentAuth': ['Auth', function (Auth) {
                        return Auth.$requireAuth();
                    }]
                }
            })
            .state('login', {
                url: '/login',
                templateUrl: 'app/login/login.tpl.html'
            });
    });

    awareApp.controller('AwareController', ['$firebase', 'Auth', '$scope', '$state',
        function ($firebase, Auth, $scope, $state) {
            var ref = new Firebase('https://elmaaler.firebaseio.com');
            $scope.auth = Auth.$getAuth();

            Auth.$onAuth(function (authData) {
                if (authData) {
                    console.log('Logged in: ' + authData.uid);
                    $scope.user = $firebase(ref.child('users').child(authData.uid)).$asObject();
                    $state.go('dashboard', {}, {
                        reload: true
                    });

                } else {
                    $scope.user = 'undefined';
                    $state.go('home', {});
                    console.log('Logged out!');
                }
            });

            this.createUser = function () {
                this.credentials = {};
            };

            this.login = function () {
                console.log('Logging in...');
                Auth.$authWithPassword(
                    this.credentials
                ).then(function (authData) {
                    console.log('Logged in as:', authData.uid);
                }).catch(function (error) {
                    console.error('Authentication failed:', error);
                });
            };

            this.logout = function () {
                console.log('Logging out...');
                Auth.$unauth();
            };

            this.isAdmin = function () {
                if ($scope.user.role === 'admin') {
                    return true; //is admin
                } else {
                    return false; //is not admin
                }
            };
        }
    ]);
}());