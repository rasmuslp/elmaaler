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
         this.currentUsage = 'Collecting data...';
         this.plotData = [];
         this.plotOptions = {
            series: [{
               y: 'value',
               color: 'steelblue',
               thickness: '2px',
               type: 'area',
               label: 'Watt'
            }],
            lineMode: 'linear',
            tension: 0.7,
            tooltip: {
               mode: 'scrubber',
               formatter: function(x, y, series) {
                  return y + ' W';
               }
            },
            drawLegend: true,
            drawDots: false,
            columnsHGap: 5
         };

         this.plotTimeZero = 'undefined';
         var self = this;
         this.data.$watch(function(event) {
            if (event.event === 'child_added') {
               // New data

               if (event.prevChild === null) {
                  return;
               }

               var n = self.data.$getRecord(event.key);
               var nMinus1 = self.data.$getRecord(event.prevChild);

               self.currentUsage = self.calculateUsage(n, nMinus1);

               if (self.plotTimeZero === 'undefined') {
                  self.plotTimeZero = n.timeStamp;
               }

               self.plotData.push({
                  x: Math.round((n.timeStamp - self.plotTimeZero) / 1000),
                  value: self.currentUsage
               });

               //console.log(self.plotData);
            }
         });



         this.calculateUsage = function(prev, current) {
            var time = prev.timeStamp - current.timeStamp;
            time = time / 1000.0;
            return Math.round(3600 / time);
         };

         this.testButton = function() {

            console.log(this.plotData);
         };
      }
   ]);

}());