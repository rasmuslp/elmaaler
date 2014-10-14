from metaheuristic import hill_climber, simulated_annealing
from metaheuristic.instance import Instance

for instance_no in [0, 1]:
    for count in [3, 5, 10]:
        instance = Instance( instance_no )
        simulated_annealing.solve( instance, count )
        print ""
        print "------"
        print ""