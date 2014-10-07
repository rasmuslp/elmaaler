'use strict';

(function() {
   var awareApp = angular.module('awareApp', ['firebase', 'n3-line-chart']);

   awareApp.filter('plotRange', function() {
      return function(input, minutes) {
         input = input || [];
         if (input.length === 0) {
            return false;
         }

         minutes = minutes || 0;
         if (minutes === 0) {
            return input;
         }

         //var startTime = new Date().getTime();

         minutes = parseInt(minutes);
         var ret = [];

         var newestTime = input[input.length - 1].x;
         var timeDiff = minutes * 60;
         for (var i = input.length - 1; i >= 0; i--) {
            if (input[i].x > newestTime - timeDiff) {
               ret.push(input[i]);
            }
            else {
               break;
            }
         }

         ret.reverse();

         //console.log('Filter took: ' + (new Date().getTime() - startTime) + ' ms');

         return ret;
      };
   });

   awareApp.factory('DataMetaRepository', function($firebase) {
      var ref = new Firebase("https://elmaaler.firebaseio.com/dataMeta");
      var data = $firebase(ref).$asArray();
      return {
         get: function() {
            return data;
         }
      }
   });

   awareApp.factory('DataRepository', function($firebase) {
      var data;

      var DataRepository = {};
      DataRepository.setup = function(key) {
         data = $firebase(new Firebase("https://elmaaler.firebaseio.com/data/" + key + '/raw')).$asArray();
      };
      DataRepository.data = function() {
         return data;
      };
      DataRepository.destroy = function() {
         data.$destroy();
      };

      return DataRepository;
   });

   awareApp.controller('PowerController', ['$firebase', 'DataMetaRepository', 'DataRepository',
      function($firebase, DataMetaRepository, DataRepository) {
         console.log('Aware starting');
         var self = this;

         //TODO: Move
         this.plotMinutes = 30;

         this.correctorEnabled = false;
         this.currentPrice = 2.2;
         this.plotOptions = {
            axes: {
               x: {
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
               color: '#00ada7',
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

         this.dataMeta = DataMetaRepository.get();
         this.dataMeta.$loaded().then(function(dataMeta) {
            // Load complete, show page
            $('#splash').fadeOut();
         });

         // For the correction algo in the $watch
         var unverfiedUsage = false;

         this.changeDataset = function() {
            if (typeof this.data !== 'undefined') {
               DataRepository.destroy();
            }

            this.currentUsage = 'Collecting data...';
            this.totalUsage = 0;
            this.plotTimeZero = 'undefined';
            this.plotData = [];

            DataRepository.setup(this.selectedDataset.data_id);
            this.data = DataRepository.data();
            this.data.$watch(function(event) {
               if (event.event === 'child_added') {
                  // New data
                  self.data.$getRecord(event.key).verified = false;
                  self.totalUsage++;
                  if (event.prevChild === null) {
                     return;
                  }

                  var current = self.data.$getRecord(event.key);
                  var prev = self.data.$getRecord(event.prevChild);
                  var usage = self.calculateUsage(current, prev);

                  if (self.correctorEnabled) {

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
                  }

                  self.addDataToPlot(current, usage);
               }
            });
         };

         // Initialse data
         this.dataMeta.$loaded().then(function(dataMeta) {
            self.dataMeta.unshift({
               data_id: 'incoming',
               title: 'Live'
            });

            self.selectedDataset = self.dataMeta[0];
            self.changeDataset();
         });

         this.calculateUsage = function(prev, current) {
            var time = prev.timeStamp - current.timeStamp;
            time = time / 1000.0;
            return Math.round(3600 / time);
         };

         this.addDataToPlot = function(dataPoint, usage) {
            // Add to plot data
            if (this.plotTimeZero === 'undefined') {
               this.plotTimeZero = dataPoint.timeStamp;
            }

            this.currentUsage = usage;

            this.plotData.push({
               x: Math.round((dataPoint.timeStamp - this.plotTimeZero) / 1000),
               usage: usage
            });
         };

         this.saveDataset = function() {
            var self = this;

            // Copy incoming data
            var currentData = [];
            angular.forEach(this.data, function(rawDataPoint) {
               this.push({
                  timeStamp: rawDataPoint.timeStamp
               });
            }, currentData);

            // Remove incoming data
            $firebase(new Firebase("https://elmaaler.firebaseio.com/data/incoming")).$remove();

            // Save current data
            $firebase(new Firebase("https://elmaaler.firebaseio.com/data/")).$push({
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