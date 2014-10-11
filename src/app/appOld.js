(function() {
   'use strict';

   var awareApp = angular.module('awareAppOld', ['firebase', 'moras.config', 'moras.auth', 'aware.admin', 'aware.dashboard', 'n3-line-chart']);

   awareApp.controller('PowerController', ['$firebase', 'DataService', 'DatametaService', 'FB_URI',
      function($firebase, DataService, DatametaService, FB_URI) {
         console.log('Aware starting');
         var self = this;

         this.authed = false;

         this.rootRef = new Firebase(FB_URI);
         this.rootRef.onAuth(function(authData) {
            if (authData) {
               console.log('Auth data found. User is logged in.');
               // HAX
               if (this.loginForm && this.loginForm.newUser) {
                  this.rootRef.child('users').child(authData.uid).set({
                     email: authData.password.email
                  }, function(error) {
                     if (error) {
                        console.log('Could not create user data in FB: %o', error);
                     }
                     else {
                        console.log('Successfully created user data.');
                     }
                  });
               }

               var deviceRef = this.rootRef.child('users').child(authData.uid).child('device');
               deviceRef.on('value', function(snapshot) {
                  this.device = snapshot.val();

                  DatametaService.setup(this.device);
                  this.dataMeta = DatametaService.data();
                  // Initialse data
                  this.dataMeta.$loaded().then(function(dataMeta) {
                     self.dataMeta.unshift({
                        dataId: 'incoming',
                        title: 'Live'
                     });

                     self.selectedDataset = self.dataMeta[0];
                     self.changeDataset();
                     self.setPlotTime(30);

                     // Load complete, show page
                     /*$('#splash').fadeOut();*/
                  });

                  this.authed = true;
               }, this);
            }
            else {
               console.log('Auth data not found. User is not logged in.');
               this.authed = false;
            }
         }, this);

         // For the correction algo in the $watch
         var unverfiedUsage = false;

         this.rawDataErrorCorrectorEnabled = true;

         this.devicesEnabled = true;

         this.currentPrice = 2.2;

         this.plotOptions = {
            axes: {
               x: {
                  type: 'date',
                  labelFunction: function(value) {
                     return value + ' s';
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
               color: '#6ad1e6',
               thickness: '1px',
               type: 'area',
               label: 'Watt'
            }],
            lineMode: 'step-after',
            tension: 2.7,
            tooltip: {
               mode: 'scrubber',
               formatter: function(x, y, series) {
                  return y + ' W at ' + x + ' s';
               }
            },
            drawLegend: false,
            drawDots: false,
            columnsHGap: 5
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
            if (typeof this.data !== 'undefined') {
               DataService.destroy();
            }

            this.currentUsage = 'Collecting data...';
            this.totalUsage = 0;
            this.timeStamp = 'undefined';
            this.plotData = [];
            this.rawDataErrors = 0;
            this.devices = [];
            this.edgeInProgress = [];

            DataService.setup(this.device, this.selectedDataset.dataId);
            this.data = DataService.data();
            this.data.$watch(function(event) {
               if (event.event === 'child_added') {
                  //jQuery('.pulse').addClass('animated bounce');
                  //$('.pulse').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', $('animated bounce').remove());

                  $('.logo').removeClass().addClass('pulse' + ' animated' + ' img img-responsive img-center logo').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
                     $(this).removeClass().addClass('img img-responsive img-center logo');
                  });

                  var current = self.data.$getRecord(event.key);
                  if (current.hasOwnProperty('timeStamp')) {
                     // Device restarted, new series beginning.
                     self.timeStamp = current.timeStamp;

                     //TODO: Any resets ?
                     return;
                  }
                  else if (current.hasOwnProperty('timeDiff')) {
                     // New data
                     self.data.$getRecord(event.key).verified = false;
                     self.totalUsage++;

                     if (event.prevChild === null) {
                        // No previous point => no calculation
                        return;
                     }
                     var prev = self.data.$getRecord(event.prevChild);
                     if (!prev.hasOwnProperty('timeDiff')) {
                        // No previous point => no calculation
                        return;
                     }

                     var newUsage = self.calculateUsage(current, prev);

                     if (self.devicesEnabled && self.currentUsage) {
                        var diff = newUsage - self.currentUsage;
                        if (Math.abs(diff) > (self.currentUsage * 0.10)) {
                           // Edge
                           self.edgeInProgress.push(newUsage);
                           console.log('Edge detected: ' + newUsage);
                        }
                        else if (self.edgeInProgress.length > 0) {
                           console.log('Edge might have ended?');
                           // Edge ended ?
                           
                           var deviceUsage = newUsage - self.edgeInProgress[0];
                           var risingEdge = deviceUsage > 0 ? true : false;

                           var TTT = newUsage - self.edgeInProgress[self.edgeInProgress.length - 1];

                           if (risingEdge) {
                              console.log('Edge is rising');
                              if (TTT < 0) {
                                 // Rising edge ended   
                                 // Do nothing here, just continue with the sweet code below.
                                 console.log('Edge ended rising, as it just fell');
                              }
                              else {
                                 // Rising edge still rising
                                 self.edgeInProgress.push(newUsage);
                                 console.log('Rising edge still rising');
                                 return;
                              }
                           }
                           else {
                              console.log('Edge is falling');
                              if (TTT > 0) {
                                 // Falling edge ended   
                                 // Do nothing here, just continue with the sweet code below.
                                 console.log('Edge ended falling, as it just increased');
                              }
                              else {
                                 // Falling edge still falling
                                 self.edgeInProgress.push(newUsage);
                                 console.log('Falling edge still falling');
                                 return;
                              }
                           }

                           deviceUsage = Math.abs(deviceUsage);
                           var deviceId = null;
                           console.log('Unidentified device usage: ' + deviceUsage);
                           console.log('Devices:');
                           for (var i = 0; i < self.devices.length; i++) {
                              console.log('Usage: ' + self.devices[i].usage);
                              console.log('Usage diff: ' + (deviceUsage - self.devices[i].usage));
                              console.log('Limit: ' + 0.20 * self.devices[i].usage);

                              if (Math.abs((deviceUsage - self.devices[i].usage)) < 0.10 * self.devices[i].usage) {
                                 // Device match
                                 console.log('Device match!');
                                 deviceId = i;
                                 break;
                              }
                           }
                           if (deviceId === null) {
                              // New device
                              var device = {
                                 title: null,
                                 active: null,
                                 usage: deviceUsage,
                                 totalUsage: 0,
                                 data: [{
                                    timeStamp: 0,
                                    usage: 978
                                 }, {
                                    timeStamp: 1,
                                    usage: 983
                                 }]
                              };
                              self.devices.push(device);
                              deviceId = self.devices.indexOf(device);
                              self.devices[deviceId].title = 'Device ' + deviceId;
                           }

                           if (risingEdge) {
                              // Rising edge
                              console.log('Device ' + deviceId + ' turned on with usage ' + deviceUsage + ' W');
                              self.devices[deviceId].active = true;
                           }
                           else {
                              // Falling edge
                              console.log('Device ' + deviceId + ' turned off with usage ' + deviceUsage + ' W');
                              self.devices[deviceId].active = false;
                           }
                           self.edgeInProgress = [];
                        }
                     }

                     if (self.rawDataErrorCorrectorEnabled) {
                        var lastVerifiedUsage;
                        var diff;

                        if (self.unverfiedUsage) {
                           // Comparison of current usage vs last unverified usage

                           lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                           diff = Math.abs(newUsage - lastVerifiedUsage);
                           if (diff > 0.05 * lastVerifiedUsage) {
                              self.addDataToPlot(prev, self.unverfiedUsage);
                           }
                           else {
                              self.rawDataErrors++;
                              console.log('It looks like a datapoint at constant load is missing. Possibly missed points: ' + self.rawDataErrors);
                              self.addDataToPlot(prev, newUsage);
                           }

                           self.unverfiedUsage = false;
                        }
                        else {
                           if (self.plotData.length > 1) {
                              // Comparison of current usage vs last verified usage
                              lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                              if (newUsage < lastVerifiedUsage && Math.abs(newUsage * 2 - lastVerifiedUsage) < 0.05 * lastVerifiedUsage) {
                                 // Caught suspecious data
                                 self.unverfiedUsage = newUsage;
                                 return;
                              }
                           }
                        }
                     } // end-if self.correctorEnabled

                     self.currentUsage = newUsage;
                     self.addDataToPlot(current, newUsage);
                  }
                  else {
                     console.warn('Unknown raw data point encountered: %o', current);
                  }

               } // end-if event.event === 'child_added'
            });
         };

         this.calculateUsage = function(prev, current) {
            var time = prev.timeDiff - current.timeDiff;
            time = time / 1000.0;
            return Math.round(3600 / time);
         };

         this.addDataToPlot = function(dataPoint, usage) {
            var pointTimeStamp = this.timeStamp * 1000 + dataPoint.timeDiff;

            this.plotData.push({
               x: new Date(pointTimeStamp),
               usage: usage
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

      }
   ]);

}());