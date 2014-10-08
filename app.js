'use strict';

(function() {
   var awareApp = angular.module('awareApp', ['firebase', 'n3-line-chart']);

   awareApp.constant('FB_URL', 'https://elmaaler.firebaseio.com/device/23436f3643fc42ee/');
   awareApp.constant('TIMEZONE_OFFSET', 2);

   awareApp.factory('DataMetaRepository', function($firebase, FB_URL) {
      var ref = new Firebase(FB_URL + '/dataMeta');
      var data = $firebase(ref).$asArray();
      return {
         get: function() {
            return data;
         }
      }
   });

   awareApp.factory('DataRepository', function($firebase, FB_URL) {
      var data;

      var DataRepository = {};
      DataRepository.setup = function(key) {
         data = $firebase(new Firebase(FB_URL + '/data/' + key + '/raw')).$asArray();
      };
      DataRepository.data = function() {
         return data;
      };
      DataRepository.destroy = function() {
         data.$destroy();
      };

      return DataRepository;
   });

   awareApp.controller('PowerController', ['$firebase', 'DataMetaRepository', 'DataRepository', 'FB_URL', 'TIMEZONE_OFFSET',
      function($firebase, DataMetaRepository, DataRepository, FB_URL, TIMEZONE_OFFSET) {
         console.log('Aware starting');
         var self = this;

         // For the correction algo in the $watch
         var unverfiedUsage = false;
         this.correctorEnabled = false;

         this.currentPrice = 2.2;

         this.dataMeta = DataMetaRepository.get();
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
            $('#splash').fadeOut();
         });

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
               DataRepository.destroy();
            }

            this.currentUsage = 'Collecting data...';
            this.totalUsage = 0;
            this.timeStamp = 'undefined';
            this.plotData = [];

            DataRepository.setup(this.selectedDataset.data_id);
            this.data = DataRepository.data();
            this.data.$watch(function(event) {
               if (event.event === 'child_added') {
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

         this.saveDataset = function() {
            var self = this;

            // Copy incoming data
            var currentData = [];
            var newestTimeStamp;
            angular.forEach(this.data, function(rawDataPoint) {
               var currentPoint = {};
               if (rawDataPoint.hasOwnProperty('timeStamp')) {
                  newestTimeStamp = rawDataPoint;
                  currentPoint.timeStamp = rawDataPoint.timeStamp;
               }
               else if (rawDataPoint.hasOwnProperty('timeDiff')) {
                  currentPoint.timeDiff = rawDataPoint.timeDiff;
               }
               else {
                  console.warn('Unknown raw data point encountered: %o', rawDataPoint);
               }
               this.push(currentPoint);
            }, currentData);

            // Remove incoming data
            $firebase(new Firebase(FB_URL + '/data/incoming')).$remove();
            //TODO: Insert newest timestamp at head of raw data

            // Save current data
            $firebase(new Firebase(FB_URL + 'data/')).$push({
               raw: currentData
            }).then(function(data_ref) {
               self.dataMeta.$add({
                  title: self.newDataset.title,
                  data_id: data_ref.name()
               }).then(function(data_meta_ref) {
                  self.selectedDataset = self.dataMeta.$getRecord(data_meta_ref.name());
                  self.changeDataset();
               })
               self.newDataset.title = '';

            });
         };

      }
   ]);

}());