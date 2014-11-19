(function () {
	'use strict';

	angular.module('dashboard-controller', []).controller('DashboardController', ['$firebase', '$scope',
		function ($firebase, $scope) {
			var self = this;

			this.factorTable = {
			    "236947b930728cee": {
			        "pulsesPerKwh": 10000,
			        "conversion": 60
			    },
			    "235c0db930728cee": {
			        "pulsesPerKwh": 10000,
			        "conversion": 60
			    },
			    "2322b8b030728cee": {
			        "pulsesPerKwh": 10000,
			        "conversion": 120
			    }
			}

			this.pulsesPerKwh = 1000;
		    this.conversion = 1;
		    if (this.factorTable.hasOwnProperty($scope.user.blinky)){
		        if (this.factorTable[$scope.user.blinky].hasOwnProperty("pulsesPerKwh")) {
		            this.pulsesPerKwh = this.factorTable[$scope.user.blinky]["pulsesPerKwh"];
		        }
		        if (this.factorTable[$scope.user.blinky].hasOwnProperty("conversion")) {
		            this.conversion = this.factorTable[$scope.user.blinky]["conversion"];
		        }
		    }

			var ref = new Firebase('https://elmaaler.firebaseio.com');

			this.currentPrice = 2.2;

			this.currentUsage = 'Collecting data...';
			this.timeStamp = 'undefined';

			this.periodUsage = 0;

			$scope.range = 5;

			var dateOptionsAxis = {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			};

			var dateOptionsTooltip = {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			};

			this.plotOptions = {
				axes: {
					x: {
						key: 'date',
						type: 'date',
						labelFunction: function (value) {
							return value.toLocaleDateString("da-DK", dateOptionsAxis);
						}
					},
					y: {
						min: 0,
						labelFunction: function (value) {
							return value + ' W';
						}
					}
				},
				series: [{
					y: 'u',
					axis: 'y',
					color: '#6ad1e6',
					thickness: '1px',
					type: 'area',
					striped: true,
					label: 'Watt'
				}],
				lineMode: 'linear',
				tension: 2.7,
				tooltip: {
					mode: 'scrubber',
					formatter: function (x, y, series) {
						return y + ' ' + series.label + ' at ' + x.toLocaleDateString("da-DK", dateOptionsTooltip);
					}
				},
				drawLegend: true,
				drawDots: false,
				columnsHGap: 5
			};

			this.barPlotOptions = {
				axes: {
					x: {
						key: 'date',
						type: 'date',
						labelFunction: function (value) {
							return value.toLocaleDateString("da-DK", dateOptionsAxis);
						}
					},
					y: {
						min: 0,
						labelFunction: function (value) {
							return value + ' Wh';
						}
					}
				},
				series: [{
					y: 'count',
					axis: 'y',
					color: '#6ad1e6',
					type: 'column',
					striped: true,
					label: 'Wh'
				}],
				lineMode: 'linear',
				tension: 0.7,
				tooltip: {
					mode: 'scrubber',

					formatter: function (x, y, series) {
						return y + ' ' + series.label + ' at ' + x.toLocaleDateString("da-DK", dateOptionsTooltip);
					}
				},
				drawLegend: true,
				drawDots: true,
				columnsHGap: 5
			};

			$scope.user.$loaded(function () {
				$scope.range = 0;
			});

			this.liveRange = 30*60;

			$scope.$watch('range', function () {
				if ($scope.range === 0) {
					self.setPlotTime(); //live data
				} else {
					self.fetchBucketData($scope.range); //historic data
				}
			});

			this.setPlotTime = function() {
				var backInTime = Date.now() / 1000 - this.liveRange;

				this.periodUsage = 0;

				// https://www.firebase.com/docs/beta/queries/web.html
				self.data = $firebase(ref.child('messagesFromBlinkies').child($scope.user.blinky).orderBy('tsFull').startAt(backInTime)).$asArray();

				self.data.$loaded(function () {
					console.log('Data:');
					console.log(self.data);
				});

				self.data.$watch(function (event) {
					if (event.event === 'child_added') {
						var point = self.data.$getRecord(event.key);

						if (point === null) {
							console.log('Point was null, ?');
						} else {
							if ('u' in point) {
								if ($scope.range === 0) {
									self.periodUsage += self.conversion * 1000.0/self.pulsesPerKwh;
								}
								self.currentUsage = point.u;
								jQuery('.pulse').addClass('animated bounce');
								$('.pulse').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', $('animated bounce').remove());
							}
							if ('tsFull' in point) {
								self.data.$getRecord(event.key)['date'] = new Date(point.tsFull * 1000);
								self.trimPlotToInterval();
							}
						}
					}
				});

				console.log("DATA IS FILTERED");
			};

			this.trimPlotToInterval = function () {
				var trimTo = new Date(Date.now() - this.liveRange * 1000).getTime();
				for (var i = 0; i < this.data.length - 1; i++) {
					if (this.data[i].date.getTime() < trimTo) {
						this.data.shift();
						i--;
						if ($scope.range === 0) {
							self.periodUsage -= self.conversion * 1000.0/self.pulsesPerKwh;
						}
					} else {
						break;
					}
				}
			};

			this.fetchBucketData = function (count) {
				this.periodUsage = 0;

				// https://www.firebase.com/docs/beta/queries/web.html
				self.bucketData = $firebase(ref.child('bucketsFromBlinkies').child($scope.user.blinky).limit(count)).$asArray();

				self.bucketData.$loaded(function () {
					console.log('Buckets:');
					console.log(self.bucketData);
				});

				self.bucketData.$watch(function (event) {
					if (event.event === 'child_added') {
						var point = self.bucketData.$getRecord(event.key);
						self.periodUsage += point.count;
						self.bucketData.$getRecord(event.key)['date'] = new Date(point.time * 1000);
					} else if (event.event === 'child_removed') {
						var newPeriodUsage = 0;

						angular.forEach(self.bucketData, function(point) {
							newPeriodUsage += point.count;
		                });

						self.periodUsage = newPeriodUsage;
					}
				});

				console.log("DATA IS FILTERED");
			};

			/*
			var hax1 = new Firebase('https://elmaaler.firebaseio.com/buckets/23436f3643fc42ee/');
			var hax2 = $firebase(hax1).$asObject();
			this.barPlotData = [];
			hax2.$loaded().then(function () {
				angular.forEach(hax2, function (value) {
					var date = new Date(value.date.time * 1000);
					date.setSeconds(0);
					this.push({
						'x': date,
						'usage': value.usage
					});
				}, self.barPlotData);
			});
			*/

			/*
			this.messages.$watch(function (event) {
				if (event.event === 'child_added') {
					//jQuery('.pulse').addClass('animated bounce');
					//$('.pulse').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', $('animated bounce').remove());

					$('.logo').removeClass().addClass('pulse' + ' animated' + ' img img-responsive img-center logo').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
						$(this).removeClass().addClass('img img-responsive img-center logo');
					});

					//var current = self.messages.$getRecord(event.key);



				} // end-if event.event === 'child_added'
			});
			*/

			/*
			UserService.load(function(){
			    this.device = UserService.user.device;

			    self.dataMeta = [{
			        dataId: 'incoming',
			        title: 'Live'
			    }];

			    self.selectedDataset = self.dataMeta[0];
			    self.changeDataset();
			    self.setPlotTime(30);
			}, this);
			*/

		}
	]);

}());