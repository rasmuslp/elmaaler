(function() {
    'use strict';

    var awareApp = angular.module('awareAppOld', ['firebase', 'aware.admin', 'aware.user', 'aware.dashboard', 'n3-line-chart']);

    awareApp.controller('PowerController', ['$firebase', 'UserService', 'DataService', 'DevicesService', 'MessagesService', '$scope',
    function($firebase, UserService, DataService, DevicesService, MessagesService, $scope) {
        var self = this;
        console.log('See me and something is wrong.');

        var ref = new Firebase('https://elmaaler.firebaseio.com');

        ref.onAuth(function(authData) {
            if (authData) {
                // user authenticated with Firebase
                console.log('TEEEEST');
                console.log('TEEEEST2');
                console.log(authData);
                console.log(ref.child('users').child(authData.uid));
                $scope.user = authData;

                //console.log('User ID: ' + authData.uid + ', Provider: ' + authData.provider);
            } else {
                console.log('ELSE');
                // user is logged out
            }
        });

        this.rawDataErrorCorrectorEnabled = true;
        this.deviceIdentifierEnabled = false;

        this.currentPrice = 2.2;

        this.plotOptions = {
            axes: {
                x: {
                    type: 'date',
                    labelFunction: function(value) {
                        return value;
                    }
                },
                y: {
                    min: 0,
                    labelFunction: function(value) {
                        return value + ' W';
                    }
                }
            },
            series: [{
                y: 'usage',
                axis: 'y',
                color: '#6ad1e6',
                thickness: '1px',
                type: 'area',
                striped: true,
                label: 'Watt'
            }, {
                y: 'deviceUsage',
                axis: 'y',
                color: 'red',
                thickness: '1px',
                type: 'area',
                label: 'Watt (devices)'
            }],
            lineMode: 'linear',
            tension: 2.7,
            tooltip: {
                mode: 'scrubber',
                formatter: function(x, y, series) {
                    return y + ' ' + series.label + ' at ' + x + ' s';
                }
            },
            drawLegend: true,
            drawDots: false,
            columnsHGap: 5
        };

        this.barPlotOptions = {
            axes: {
                x: {
                    type: 'date',
                    labelFunction: function(value) {
                        return value;
                    }
                },
                y: {
                    min: 0,
                    labelFunction: function(value) {
                        return value + ' Wh';
                    }
                }
            },
            series: [{
                y: 'usage',
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

                formatter: function(x, y, series) {
                    return y + ' ' + series.label + ' at ' + x + ' minutes';
                }
            },
            drawLegend: true,
            drawDots: true,
            columnsHGap: 1
        };

        this.setPlotTime = function(minutes) {
            minutes = parseInt(minutes || 0, 10);
            var oldMinutes = this.plotMinutes || 0;
            if (minutes === oldMinutes) {
                return;
            }
            this.plotMinutes = minutes;

            if ((minutes > oldMinutes && oldMinutes !== 0) || minutes === 0) {
                // Need to add data, reset to solve this
                this.changeDataset();
            }

            // Trim what is needed
            this.trimPlotToInterval();
        };

        this.changeDataset = function() {
            if (typeof this.messages !== 'undefined') {
                MessagesService.destroy();
            }

            this.currentUsage = 'Collecting data...';
            this.totalUsage = 0;
            this.timeStamp = 'undefined';
            this.plotData = [];
            this.rawDataErrors = 0;

            // Device vars
            this.edgeInProgress = [];
            this.edgeNext = [];
            this.devices = [];
            this.unknownDeviceOffErrors = 0;
            this.edgeInProgressLastUsageOffErrors = 0;
            this.trimmedDeviceByImpossibleUsage = 0;

            // Device detection vars
            this.enableTrimOfChanges = true;
            this.enableDeviceUsageTrimmer = false;


            // DevicesService.setup(this.device);
            // this.imp = DevicesService.get();
            // this.imp.$loaded().then(function() {
            //   DataService.setup(self.imp.dataKey);
            //   self.data = DataService.get();
            //   self.data.$watch(function(event){
            //       console.log('Data !! %o', self.data);
            //       if (event.event === 'child_added') {
            //           console.log(self.data.$getRecord(event.key));
            //       }
            //   });
            // });
            var hax1 = new Firebase('https://elmaaler.firebaseio.com/buckets/23436f3643fc42ee/');
            var hax2 = $firebase(hax1).$asObject();
            this.barPlotData = [];
            hax2.$loaded().then(function() {
                angular.forEach(hax2, function(value) {
                    var date = new Date(value.date.time*1000);
                    date.setSeconds(0);
                    this.push({
                        'x': date,
                        'usage': value.usage}
                    );
                }, self.barPlotData);
            });

            MessagesService.setup(this.device);
            this.messages = MessagesService.get();
            this.messages.$watch(function(event) {
                if (event.event === 'child_added') {
                    //jQuery('.pulse').addClass('animated bounce');
                    //$('.pulse').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', $('animated bounce').remove());

                    $('.logo').removeClass().addClass('pulse' + ' animated' + ' img img-responsive img-center logo').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
                        $(this).removeClass().addClass('img img-responsive img-center logo');
                    });

                    var current = self.messages.$getRecord(event.key);
                    console.log(current);
                    if (current.hasOwnProperty('ts')) {
                        // Device restarted, new series beginning.
                        self.timeStamp = current.ts;

                        //TODO: Any resets ?
                        return;
                    }
                    else if (current.hasOwnProperty('td')) {
                        // New data
                        self.messages.$getRecord(event.key).verified = false;
                        self.totalUsage++;
                        if (event.prevChild === null) {
                            // No previous point => no calculation
                            return;
                        }
                        var prev = self.messages.$getRecord(event.prevChild);
                        if (!prev.hasOwnProperty('td')) {
                            // No previous point => no calculation
                            return;
                        }

                        var newUsage = self.calculateUsage(current, prev);

                        self.deviceUsageTrimmer(newUsage);
                        self.deviceIdentifier(current, newUsage);

                        var proceed = self.rawDataErrorCorrector(prev, newUsage);
                        if (!proceed) {
                            // Waiting to see how load changes (we might have missed a datapoint)
                            return;
                        }

                        self.addDataToPlot(current, newUsage);
                    }
                    else {
                        console.warn('Unknown raw data point encountered: %o', current);
                    }

                } // end-if event.event === 'child_added'
            });
        };

        this.calculateUsage = function(prev, current) {
            var time = prev.td - current.td;
            time = time / 1000.0;
            return Math.round(3600 / time);
        };

        this.deviceUsageTrimmer = function(usage) {
            var totalActiveDeviceUsage = 0;

            for (var i = 0; i < this.devices.length; i++) {
                if (this.devices[i].active) {
                    if (this.devices[i].usage > usage) {
                        // Alright, this can't be happening. Turning device off.
                        this.trimmedDeviceByImpossibleUsage++;
                        if (this.enableDeviceUsageTrimmer) {
                            this.devices[i].active = false;
                            console.log('Turned off device "' + this.devices[i].title + '" as it uses ' + this.devices[i].usage + 'W while only ' + usage + 'W is actually being used. Error counter: ' + this.trimmedDeviceByImpossibleUsage);
                            continue;
                        }
                        else {
                            console.log('Device using too much power: "' + this.devices[i].title + '" as it uses ' + this.devices[i].usage + 'W while only ' + usage + 'W is actually being used. Error counter: ' + this.trimmedDeviceByImpossibleUsage);
                        }
                    }
                    totalActiveDeviceUsage += this.devices[i].usage;
                }
            }

            if (totalActiveDeviceUsage > usage) {
                // Oh boy, here we go again..... Devices can't use more power than registered by the meter.
                console.log('Devices are using more power (' + totalActiveDeviceUsage + 'W) than the meter says (' + usage + 'W)');
            }
        };

        this.deviceIdentifier = function(dataPoint, usage) {
            if (!(this.deviceIdentifierEnabled && (typeof this.currentUsage === 'number'))) {
                return;
            }

            var currentUsage = this.currentUsage;
            var diff = usage - currentUsage;
            console.log('DI: ' + currentUsage + 'W to ' + usage + 'W');

            // Determine directions
            var edgeStartDirection = null;
            var edgeEndDirection = null;
            if (this.edgeInProgress.length > 1) {
                var edgeStartDiff = this.edgeInProgress[1] - this.edgeInProgress[0];
                if (edgeStartDiff === 0) {
                    console.error('Start of edge is completely level. This should be impossible!');
                    edgeStartDirection = 0;
                } else if (edgeStartDiff > 0) {
                    edgeStartDirection = 1;
                } else {
                    edgeStartDirection = -1;
                }

                var edgeEndDiff = usage - this.edgeInProgress[this.edgeInProgress.length - 1];
                if (edgeEndDiff === 0) {
                    edgeEndDirection = 0;
                } else if (edgeEndDiff > 0) {
                    edgeEndDirection = 1;
                } else {
                    edgeEndDirection = -1;
                }
            }

            if (Math.abs(diff) > (currentUsage * 0.10)) {
                // Edge
                console.log('Edge detected: ' + currentUsage + 'W to ' + usage + 'W');

                if (this.edgeInProgress.length === 0) {
                    // New edge, push points and return
                    this.edgeInProgress.push(currentUsage);
                    this.edgeInProgress.push(usage);
                    return;
                }
                else {
                    // Edge already in progress
                    if (edgeStartDirection === edgeEndDirection * -1) {
                        // Direction changed, other device must have turned on. End edge and start a new.
                        //NB: This might not be reliable!
                        console.log('Direction changed: New device. Usage for next round: ' + currentUsage + 'W ' + usage + 'W');
                        this.edgeNext.push(currentUsage);
                        this.edgeNext.push(usage);
                    }
                    else {
                        // Direction unchanged, push point and return
                        this.edgeInProgress.push(usage);
                        return;
                    }
                }
            }

            if (this.edgeInProgress.length < 2) {
                return;
            }

            // Edge ended ?
            console.log('Edge end ? DS: ' + edgeStartDirection + ' ' + edgeEndDirection + ' Usage change: ' + currentUsage + 'W to ' + usage + 'W');
            if (currentUsage !== this.edgeInProgress[this.edgeInProgress.length - 1]) {
                this.edgeInProgressLastUsageOffErrors++;
                console.error('edgeInProgressLastUsageOffErrors: ' + this.edgeInProgressLastUsageOffErrors);
                this.deviceIdentifierCleaner();
                return;
            }

            var edgeEndDetection = 'belowChange5';

            if (edgeEndDetection === 'directionChange') {
                if (edgeStartDirection === 1) {
                    if (edgeEndDirection < edgeStartDirection) {
                        // Rising edge ended
                        // Do nothing here, just continue with the sweet code below.
                        console.log('Edge ended rising, as it just leveled out or fell');
                    }
                    else {
                        // Rising edge still rising
                        this.edgeInProgress.push(usage);
                        console.log('Rising edge still rising');
                        return;
                    }
                }
                else {
                    if (edgeStartDirection < edgeEndDirection) {
                        // Falling edge ended
                        // Do nothing here, just continue with the sweet code below.
                        console.log('Edge ended falling, as it just leveled out or increased');
                    }
                    else {
                        // Falling edge still falling
                        this.edgeInProgress.push(usage);
                        console.log('Falling edge still falling');
                        return;
                    }
                }
            }
            else if (edgeEndDetection === 'belowChange5') {
                if (Math.abs(diff) < 0.05 * currentUsage) {
                    // Only ripples now, device change ended
                    console.log('Change < 5% Edge ended.');
                }
                else {
                    console.log('Change MORE than 5%.');
                    if (edgeStartDirection === edgeEndDirection * -1) {
                        // Direction changed, other device must have turned on. End edge and start a new.
                       console.log('Current edge ending due to direction change.');
                    } else {
                       console.log('Edge continuing.');
                       this.edgeInProgress.push(usage);
                       return;
                    }
                }
            }

            // Process ended edge
            var deviceUsageMin = Math.min.apply(null, this.edgeInProgress);
            var deviceUsageMax = Math.max.apply(null, this.edgeInProgress);
            var deviceUsage = deviceUsageMax - deviceUsageMin;
            console.log('Edge detection done. Device usage: ' + deviceUsage);

            var deviceId = null;
            // console.log('Devices:');
            var candidates = [];
            for (var i = 0; i < this.devices.length; i++) {
                // console.log('Usage: ' + this.devices[i].usage);
                // console.log('Usage diff: ' + (deviceUsage - this.devices[i].usage));
                // console.log('Limit: ' + 0.20 * this.devices[i].usage);

                var deviceUsageDiff = Math.abs(deviceUsage - this.devices[i].usage);
                if (deviceUsageDiff < 0.10 * this.devices[i].usage) {
                    // Device candidate found
                    candidates.push({
                        id: i,
                        usageDiff: deviceUsageDiff
                    });
                }
            }
            if (candidates.length > 0) {
                candidates.sort(function(a, b) {
                   if (a.usageDiff < b.usageDiff) {
                       return -1;
                   }
                   if (a.usageDiff > b.usageDiff) {
                       return 1;
                   }
                   return 0;
                });
                console.log('Candidates: %o', candidates );
                deviceId = candidates[0].id;
                console.log('Device match (' + this.devices[deviceId].usage + 'W) determined usage: ' + deviceUsage);
            }

            if (candidates.length > 1) {
                console.error('More than one device candidate!! (Good?)');
            }

            if (deviceId === null) {
                if (edgeStartDirection === -1) {
                    // Unknown device turned off
                    this.unknownDeviceOffErrors++;
                    console.log('Unknown device turned off. Usage diff: ' + deviceUsage + 'W. Error counter: ' + this.unknownDeviceOffErrors);
                    this.deviceIdentifierCleaner();
                    if (this.enableTrimOfChanges) {
                        return;
                    }
                }

                // New device
                var device = {
                    title: null,
                    usage: deviceUsage,
                    active: null,
                    stateChangeDates: [],
                    totalUsage: 0,
                    data: []
                };
                this.devices.push(device);
                deviceId = this.devices.indexOf(device);
                this.devices[deviceId].title = 'Device ' + deviceId;
            }

            // Add plot data to device
            //TODO: Add data from the rising/falling edge (can't do that now as timestamps are missing)
            //TODO: Subtract device usage from the remaining baseline
            this.devices[deviceId].data.push({
                x: this.calculateDataPointDate(dataPoint),
                usage: deviceUsage
            });

            if (edgeStartDirection === 1) {
                // Rising edge
                console.log('Device ' + deviceId + ' turned on with usage ' + deviceUsage + ' W');
                if (this.devices[deviceId].active) {
                    console.warn('Device ' + deviceId + ' is already turned on!');
                }
                this.devices[deviceId].active = true;
                this.devices[deviceId].stateChangeDates.push({
                    on: this.calculateDataPointDate(dataPoint),
                    off: null
                });
            }
            else {
                // Falling edge
                console.log('Device ' + deviceId + ' turned off with usage ' + deviceUsage + ' W');
                this.devices[deviceId].active = false;
                var stateChangeDates = this.devices[deviceId].stateChangeDates;
                if (stateChangeDates.length > 0) {
                    this.devices[deviceId].stateChangeDates[stateChangeDates.length - 1].off = this.calculateDataPointDate(dataPoint);
                }
            }

            this.deviceIdentifierCleaner();
        };

        this.deviceIdentifierCleaner = function() {
            this.edgeInProgress = this.edgeNext;
            this.edgeNext = [];
        };

        this.rawDataErrorCorrector = function(prev, usage) {
            if (this.rawDataErrorCorrectorEnabled) {
                var lastVerifiedUsage;
                var diff;

                if (this.unverfiedUsage) {
                    // Comparison of current usage vs last unverified usage

                    lastVerifiedUsage = this.plotData[this.plotData.length - 1].usage;
                    diff = Math.abs(usage - lastVerifiedUsage);
                    if (diff > 0.05 * lastVerifiedUsage) {
                        this.addDataToPlot(prev, this.unverfiedUsage);
                    }
                    else {
                        this.rawDataErrors++;
                        console.log('It looks like a datapoint at constant load is missing. Possibly missed points: ' + this.rawDataErrors);
                        this.addDataToPlot(prev, usage);
                    }

                    this.unverfiedUsage = false;
                }
                else {
                    if (this.plotData.length > 1) {
                        // Comparison of current usage vs last verified usage
                        lastVerifiedUsage = this.plotData[this.plotData.length - 1].usage;
                        if (usage < lastVerifiedUsage && Math.abs(usage * 2 - lastVerifiedUsage) < 0.05 * lastVerifiedUsage) {
                            // Caught suspecious data
                            this.unverfiedUsage = usage;
                            return false;
                        }
                    }
                }
            }

            return true;
        };

        this.calculateDataPointDate = function(dataPoint) {
            return new Date(this.timeStamp * 1000 + dataPoint.td);
        };

        this.addDataToPlot = function(dataPoint, usage) {
            this.currentUsageChange = usage - this.currentUsage;
            this.currentUsage = usage;

            var currentDeviceUsage = 0;
            for (var i = 0; i < this.devices.length; i++) {
                if (this.devices[i].active) {
                    currentDeviceUsage += this.devices[i].usage;
                }
            }

            if (this.devices.length > 0) {
                console.log('No. registered devices ' + this.devices.length + ' of which ' + this.countActiveDevices() + ' devices are on.');
            }

            this.plotData.push({
                x: this.calculateDataPointDate(dataPoint),
                usage: usage,
                deviceUsage: currentDeviceUsage
            });

            this.trimPlotToInterval();
        };

        this.trimPlotToInterval = function() {
            if (this.plotMinutes === 0 || this.plotData.length === 0) {
                // No triming
                return;
            }

            var newestDate = this.plotData[this.plotData.length - 1].x;
            var timeDiff = this.plotMinutes * 60 * 1000;
            for (var i = 0; i < this.plotData.length - 1; i++) {
                if (this.plotData[i].x.getTime() < newestDate.getTime() - timeDiff) {
                    this.plotData.shift();
                    i--;
                }
                else {
                    break;
                }
            }
        };

        this.removeDevice = function(deviceId) {
            this.devices.splice(deviceId, 1);
        };

        this.countActiveDevices = function() {
            if (!this.devices) {
                return 0;
            }

            var count = 0;
            for (var i = 0; i < this.devices.length; i++) {
                if (this.devices[i].active) {
                    count++;
                }
            }
            return count;
        };

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

    }
    ]);

}());