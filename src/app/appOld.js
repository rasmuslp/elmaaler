'use strict';

(function() {
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
                        data_id: 'incoming',
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
         this.correctorEnabled = true;

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
                     return value + ' W'
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
            minutes = parseInt(minutes || 0);
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
         }

         this.changeDataset = function() {
            if (typeof this.data !== 'undefined') {
               DataService.destroy();
            }

            this.currentUsage = 'Collecting data...';
            this.totalUsage = 0;
            this.timeStamp = 'undefined';
            this.plotData = [];

            DataService.setup(this.device, this.selectedDataset.data_id);
            this.data = DataService.data();
            this.data.$watch(function(event) {
               if (event.event === 'child_added') {
                  //jQuery('.pulse').addClass('animated bounce');
                  //$('.pulse').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', $('animated bounce').remove());
                  
                  $('.logo').removeClass().addClass('pulse' + ' animated' + ' img img-responsive img-center logo').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
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

                     var usage = self.calculateUsage(current, prev);

                     if (self.correctorEnabled) {
                        // TODO: NB: Corrector might not work with new data format :<

                        if (self.unverfiedUsage) {
                           // Comparison of current usage vs last unverified usage

                           var lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                           var diff = Math.abs(usage - lastVerifiedUsage);
                           if (diff > 0.05 * lastVerifiedUsage) {
                              console.log('Alright, load must have changed');
                              self.addDataToPlot(prev, self.unverfiedUsage);
                           }
                           else {
                              console.log('Correcting data');
                              self.addDataToPlot(prev, usage);
                           }

                           self.unverfiedUsage = false;
                        }
                        else {
                           if (self.plotData.length > 1) {
                              // Comparison of current usage vs last verified usage
                              var lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                              var diff = Math.abs(usage - lastVerifiedUsage);
                              if (diff > 0.05 * lastVerifiedUsage) {
                                 // Max 10% diff filter
                                 console.log('Diff to big, not verified');
                                 self.unverfiedUsage = usage;
                                 return;
                              }
                           }
                        }
                     } // end-if self.correctorEnabled 

                     self.addDataToPlot(current, usage);
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
            this.currentUsage = usage;

            //var timezoneOffset = TIMEZONE_OFFSET * 3600;
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