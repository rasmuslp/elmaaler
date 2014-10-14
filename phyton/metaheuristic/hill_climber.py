from .instance import Instance
from .state import State

def solutions( instance_no, count ):
    instance = Instance( instance_no, 42 )

    #TODO use count for count best states

    # Generate starting state
    current_state = State( [], instance )

    for i in range(0, 500):
        val = current_state.value()
        neighbours = current_state.neighbourhood()
        found = False
        for n in neighbours:
            if n.value() < val :
                val = n.value()
                current_state = n
                found = True

        if found == False:
            print "Stopping since nothing better found!"
            break


    return current_state