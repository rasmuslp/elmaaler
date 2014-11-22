(function () {
    'use strict';
    var awareApp = angular.module('awareApp', ['admin-controller', 'dashboard-controller', 'firebase', 'ui.router', 'n3-line-chart']);

    // let's create a re-usable factory that generates the $firebaseAuth instance
    awareApp.factory('Auth', ['$firebaseAuth', function ($firebaseAuth) {
        var ref = new Firebase('https://elmaaler.firebaseio.com');
        return $firebaseAuth(ref);
    }]);

    awareApp.factory('User', ['$firebase', 'Auth', function ($firebase, Auth) {
        var authData = Auth.$getAuth();
        if (authData) {
            console.log('Fetching user data...');
            var ref = new Firebase('https://elmaaler.firebaseio.com');
            return $firebase(ref.child('users').child(authData.uid)).$asObject();
        } else {
            console.warn('No auth, no user data...');
            return false;
        }
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
                        console.log('Trying to resolve auth pre dashboard');
                        return Auth.$requireAuth();
                    }],
                    'currentUser': ['User', function (User) {
                        console.log('Trying to resolve user pre dashboard');
                        return User.$loaded();
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

    awareApp.controller('AwareController', ['$firebase', 'Auth', 'User', '$scope', '$state',
        function ($firebase, Auth, User, $scope, $state) {
            var ref = new Firebase('https://elmaaler.firebaseio.com');

            Auth.$onAuth(function (authData) {
                if (authData) {
                    $scope.auth = authData;
                    console.log('Logged in: %o', authData);
                    $state.go('dashboard', {}, {
                        reload: true
                    });
                } else {
                    $scope.auth = null;
                    console.log('Logged out!');
                    $state.go('home', {}, {
                        reload: true
                    });
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
                return false;
                if (User) {
                    User.$loaded()
                        .then(function (data) {
                            if (data.role === 'admin') {
                                return true;
                            } else {
                                return false;
                            }
                        })
                        .catch(function (error) {
                            console.error("Error:", error);
                            return false;
                        });
                } else {
                    return false;
                }
            };
        }
    ]);
}());