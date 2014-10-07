'use strict';

(function() {
   var awareApp = angular.module('awareApp', ['firebase', 'n3-line-chart']);

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
               color: '#9dbc8b',
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
            
            this.trimPlotToInterval();
         };
         
         this.trimPlotToInterval = function() {
            if (this.plotMinutes === 0 || this.plotData.length === 0) {
               // No triming
               return;
            }
            
            var newestTime = this.plotData[this.plotData.length - 1].x;
            var timeDiff = this.plotMinutes * 60;
            for (var i = 0; i < this.plotData.length - 1; i++) {
               if (this.plotData[i].x < newestTime - timeDiff) {
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