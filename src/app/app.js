(function () {
    'use strict';
    var awareApp = angular.module('awareApp', ['admin-controller', 'dashboard-controller', 'firebase', 'ui.router', 'n3-line-chart']);

    awareApp.config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: 'app/home/home.tpl.html',
                type: 'public',
            })
            .state('dashboard', {
                url: '/dashboard',
                templateUrl: 'app/dashboard/dashboard.tpl.html',
                controller: 'DashboardController as dashboardCtrl',
                type: 'private',
            })
            .state('admin', {
                url: '/admin',
                templateUrl: 'app/admin/admin.tpl.html',
                controller: 'AdminController as adminCtrl',
                type: 'private',
            })
            .state('login', {
                url: '/login',
                templateUrl: 'app/login/login.tpl.html',
                type: 'public',
            });
    });

    awareApp.controller('AwareController', ['$firebase', '$scope', '$state',
		function ($firebase, $scope , $state) {
		    $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
		        if (toState.type === 'private' && !$scope.user.email) {
		            event.preventDefault();
                    $state.go( "login", {});
		        }
            });

		    var ref = new Firebase('https://elmaaler.firebaseio.com');
			ref.onAuth(function (authData) {
				if (authData) {
					$scope.auth = authData;
					console.log($scope.auth.uid);
					$scope.user = $firebase(ref.child('users').child(authData.uid)).$asObject();
			        $state.go('dashboard', {}, {reload: true});

				} else {
				    $scope.user = "undefined";
				    $state.go('home', {});
					console.log('Logged out!');
				}
			});

		    this.createUser = function () {
                    this.credentials = {};
                };

                this.login = function () {
                    console.log("logging in");
                    ref.authWithPassword(
                        this.credentials, function(err, authData) {
                        console.log(err);
                    });

                };

                this.logout = function () {
                    console.log("logging out!");
                    ref.unauth();
                };

                this.isAdmin = function() {
                    if ($scope.user.role === 'admin')
                    {
                        return true; //is admin
                    } else {
                        return false; //is not admin
                    }

                }
		}
	]);
}());