(function() {
    'use strict';

    var adminController = angular.module('aware.admin.controller', ['firebase', 'aware.dashboard.data.service', 'aware.dashboard.datameta.service']);
    adminController.controller('AdminController', ['$firebase', 'DataService', 'DatametaService', function($firebase, DataService, DatametaService){
        this.toggleSplash = function() {
            $('#splash').fadeToggle();
         };

          this.saveDataset = function() {
            var self = this;

            // Copy incoming data
            var currentData = [];
            var newestTimeStamp;
            angular.forEach(DataService.data(), function(rawDataPoint) {
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
            $firebase(new Firebase('https://elmaaler.firebaseio.com/' + 'device/23436f3643fc42ee/' + '/data/incoming')).$remove();
            //TODO: Insert newest timestamp at head of raw data

            // Save current data
            $firebase(new Firebase('https://elmaaler.firebaseio.com/' + 'device/23436f3643fc42ee/' + 'data/')).$push({
               raw: currentData
            }).then(function(dataRef) {
               DatametaService.data.$add({
                  title: self.newDataset.title,
                  dataId: dataRef.name()
               }).then(function(datametaRef) {
                  self.selectedDataset = self.dataMeta.$getRecord(datametaRef.name());
                  self.changeDataset();
               });
               self.newDataset.title = '';

            });
         };


    }]);

}());