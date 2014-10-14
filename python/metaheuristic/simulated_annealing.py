from .instance import Instance
from .state import State
import random
import math
import heapq
import pprint
pp = pprint.PrettyPrinter( indent= 3 )

def acceptance_probability( current_energy, neighbour_energy, temp ):
    if neighbour_energy < current_energy:
        return 1.0

    return math.exp( (current_energy - neighbour_energy) / temp )


def solve( instance_no, count, usage ):
    instance = Instance( instance_no )
    instance.measured_consumption = usage
    # TODO use count for count best states

    # Settings
    temp = 1.3 ** instance.size
    cooling_rate = 0.002

    # Generate starting state
    current_state = State( [], instance )
    val = current_state.value

    best_state = current_state
    best_val = current_state.value

    best_states = MaxHeap()
    best_states.push( current_state )
    best_state_threshold = current_state.value

    iterations = 0
    ap_hit = 0
    format_string = " [%.5d] Temp = %.2f | ap = %.4f | rand = %.4f | nv = %d | bv = %d | v = %d | bst = %d | ap_hit = %d"

    while temp > 1:
        neighbour = current_state.single_far_neighbour()
        ap = acceptance_probability( current_state.value, neighbour.value, temp )
        rand = random.random()

        if ap > rand:
            current_state = neighbour
            val = neighbour.value
            ap_hit += 1

        if neighbour.value < best_val:
            best_state = neighbour
            best_val = neighbour.value
            #print "(New Best )" + format_string  % ( iterations, temp, ap, rand, neighbour.value, best_val, val, best_state_threshold, ap_hit )

        if not best_states.contains( neighbour ):
            if best_states.size < count:
                best_states.push( neighbour)
                best_state_threshold = best_states.smallest()
                #print "(Filling  )" + format_string  % ( iterations, temp, ap, rand, neighbour.value, best_val, val, best_state_threshold, ap_hit )
            elif neighbour.value < best_state_threshold:
                best_states.pop()
                best_states.push(neighbour)
                best_state_threshold = best_states.smallest()
                #print "(Replacing)" + format_string  % ( iterations, temp, ap, rand, neighbour.value, best_val, val, best_state_threshold, ap_hit )


        temp *= 1 - cooling_rate
        iterations += 1

    #print "* Found value of %d when looking for %d in instance %d using %d iterations " % ( best_state.consumes, instance.measured_consumption, instance_no, iterations )
    #print "** %d best states " % count
    #print best_states.str_nsmallest
    response = {'totalConsume': best_state.consumes, 'devices': best_state.devices}
    return ( response )

# See http://stackoverflow.com/questions/14189540/python-topn-max-heap-use-heapq-or-self-implement
import heapq
class MaxHeap(object):
    def __init__(self):
        self.heap = []
        self.size = 0
        self.dict = set([])
        heapq.heapify(self.heap)
    def push(self, state):
        self.size += 1
        self.dict.add( state )
        heapq.heappush(self.heap, (-state.value, state))
    def pop(self):
        self.size -= 1
        elem = heapq.heappop(self.heap)
        self.dict.remove( elem[1] )
        return -elem[0]
    def smallest(self):
        return -heapq.nsmallest(1, self.heap)[0][0]
    def str_nsmallest(self, n):
        return [ str(x[1]) for x in heapq.nsmallest(n, self.heap) ]
    def contains(self, state):
        return state in self.dict
