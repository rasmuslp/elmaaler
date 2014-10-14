import random
class State:

    def __init__(self, devices, instance ):
        self.devices = frozenset(devices)
        self.instance = instance
        self.consumes = self.instance.sum( self.devices )
        self.value = abs(self.instance.measured_consumption - self.consumes)
        self.device_count = len(devices)

    def neighbourhood(self):
        neighbors = []
        # One bit is removed
        for i in range(0, len( self.devices )):
            n_dev = list(self.devices) # copy
            n_dev.pop(i)
            neighbors.append( State( n_dev, self.instance) )

        #, or one is added (which isn't already there)
        for i in [x for x in self.instance.device_ids() if x not in self.devices]:
            n_dev = list(self.devices)
            n_dev.append(i)
            neighbors.append( State( n_dev, self.instance) )

        #print neighbors
        #print "Made %d neighbours from %s" % (len(neighbors), self)
        return neighbors

    def single_far_neighbour(self):
        # Bits flipped between 1 and half the number of devices
        sample_size = random.randint(1, self.instance.size / 2)
        devices_to_flip = random.sample( self.instance.device_ids, sample_size )
        neighbour_devices = list(self.devices)

        for i in devices_to_flip:
            if i in neighbour_devices:
                neighbour_devices.remove( i )
            else:
                neighbour_devices.append( i )

        return State( neighbour_devices, self.instance )

    def __str__(self):
        return "%s" % (self.instance.sum(self.devices))

    def __repr__(self):
        return str(self.instance.names( self.devices ))

    def __eq__(self, other):
        return other and set(self.devices) == set(other.devices)

    def __hash__(self):
        return hash(self.devices)