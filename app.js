'use strict';

(function() {
   var awareApp = angular.module('awareApp', ['firebase', 'n3-line-chart']);

   awareApp.factory('IncommingDataRepository', function($firebase) {
      var ref = new Firebase("https://elmaaler.firebaseio.com/01/data");
      var sync = $firebase(ref);
      var data = sync.$asArray();
      return {
         get: function() {
            return data;
         }
      };
   });

   awareApp.controller('PowerController', ['IncommingDataRepository',
      function(IncommingDataRepository) {
         this.data = IncommingDataRepository.get();
         
         // Load complete, show page
         $('#splash').fadeOut();
         
         this.currentPrice = 2.2;
         this.currentUsage = 'Collecting data...';
         this.totalUsage = 0;
         this.plotData = [];
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
               color: 'grey',
               thickness: '1px',
               type: 'area',
               label: 'Watt'
            }],
            lineMode: 'linear',
            tension: 0.7,
            tooltip: {
               mode: 'scrubber',
               formatter: function(x, y, series) {
                  return y + ' W at ' + x + ' s';
               }
            },
            drawLegend: true,
            drawDots: false,
            columnsHGap: 5
         };

         this.plotTimeZero = 'undefined';

         var self = this;
         var unverfiedUsage = false;

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

               if (self.unverfiedUsage) {
                  // Comparison of current usage vs last unverified usage
                  
                  //var lastUsage = self.unverfiedUsage;
                  var lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                  var diff = Math.abs(usage - lastVerifiedUsage);
                  if (diff > 0.05* lastVerifiedUsage) {
                     console.log('Alright, load must have changed');
                     self.addDataToPlot(prev, self.unverfiedUsage);
                  } else {
                     console.log('Correcting data');
                     self.addDataToPlot(prev, usage);
                  }
                  
                  self.unverfiedUsage = false;
               } else {
                  //??

                  if (self.plotData.length > 1) {
                     // Comparison of current usage vs last verified usage
                     var lastVerifiedUsage = self.plotData[self.plotData.length - 1].usage;
                     var diff = Math.abs(usage - lastVerifiedUsage);
                     if (diff > 0.05* lastVerifiedUsage) {
                        // Max 10% diff filter
                        console.log('Diff to big, not verified');
                        self.unverfiedUsage = usage;
                        return;
                     }
                  }
                  
                  //??
               }

               // var currentM2 = self.data.$getRecord(self.data.$keyAt(self.data.$indexFor(event.prevChild)-1));
               // var currentM3 = self.data.$getRecord(self.data.$keyAt(self.data.$indexFor(event.prevChild)-2));
               //var usageM2 = self.calculateUsage(currentM2, currentM3);
               
               self.addDataToPlot(current, usage);
            }
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
            
            // // Add to total usage
            // if (typeof this.totalUsage === 'string') {
            //    this.totalUsage = 0;
            // }
            
            // // Hax calculation comming rigth up !
            // if (this.plotData.length > 1) {
            //    var time = this.plotData[this.plotData.length-1].x - this.plotData[this.plotData.length-2].x
            //    this.totalUsage += usage / time;
            // }
         };
         
      }
   ]);

}());