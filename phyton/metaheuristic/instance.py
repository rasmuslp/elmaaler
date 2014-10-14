#!/usr/bin/env python
# -*- coding: utf-8 -*-

class Device:
    def __init__(self, consumption_mean, consumption_variance, name, type ):
        self.consumption_mean = consumption_mean
        self.consumption_variance = consumption_variance
        self.name = name
        self.type = type

class Instance:

    def __init__( self, no ):
        if no == 0:
            self.devices = [
                Device( 9, 2, "Lampe i stuen", "Lightbulb" ),
                Device( 9, 2, "Lampe 2 i stuen", "Lightbulb" ),
                Device( 100, 25, "Lunge maskine", "Computer" ),
                Device( 50, 15, "Lunges skærm", "Monitor" ),
                Device( 130, 25, "Fjæs' iMac", "Computer" ),
                Device( 500, 40, "Ovn", "Oven" ),
                Device( 200, 10, "Kaffemaskine", "Coffeebrewer" ),
                Device( 25, 10, "Udendørslys", "Lightbulb" )
            ]
        elif no == 1:
            self.devices = [
                Device( 9, 2, "Lampe i stuen", "Lightbulb" ),
                Device( 9, 2, "Lampe 2 i stuen", "Lightbulb" ),
                Device( 100, 25, "Lunge maskine", "Computer" ),
                Device( 50, 15, "Lunges skærm", "Monitor" ),
                Device( 130, 25, "Fjæs' iMac", "Computer" ),
                Device( 500, 40, "Ovn", "Oven" ),
                Device( 200, 10, "Kaffemaskine", "Coffeebrewer" ),
                Device( 25, 10, "Udendørslys", "Lightbulb" ),
                Device( 9, 2, "Enhed1", "Lightbulb" ),
                Device( 350, 2, "Sybian (Lunge)", "Lightbulb" ),
                Device( 250, 2, "Sybian (Fjæs)", "Lightbulb" ),
                Device( 600, 2, "Dual sybian (fælles)", "Lightbulb" ),
                Device( 120, 2, "TV", "Lightbulb" ),
            ]

        self.number = no
        self.max_sum = sum( self.devices[i].consumption_mean for i in range(0, len(self.devices)))
        self.measured_consumption = 170
        self.size = len(self.devices)
        self.device_ids = range(0, self.size )

    def sum(self, indices):
        return sum( [self.devices[i].consumption_mean for i in indices ] )

    def names(self, indices):
        return [self.devices[i].name for i in indices ]

