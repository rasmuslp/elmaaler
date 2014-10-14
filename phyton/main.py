from metaheuristic import hill_climber, simulated_annealing
from firebase import Firebase
import matplotlib.pyplot as plt
import json

f = Firebase('https://elmaaler.firebaseio.com/device/**********/data/incoming/raw2')
r = f.get()
d = []
i = 0
s = []
prevTime = 0
for k,v in iter(sorted(r.iteritems())):
  #print v['timeDiff']
  #print (v['timeDiff']-l)/1000
  #print v
  if (i == 1):
    prevTime=v['timeDiff']
  i = i + 1
  if (prevTime != 0):
    time = v['timeDiff'] - prevTime-1;
    time = time / 1000.0;
    usage = 3600 / time;
    print usage
    d.append(usage)
  prevTime = v['timeDiff']

for i in range(len(d)):
  usage = d[i]
  devicesUsage = simulated_annealing.solve( 1, 1, usage )
  print devicesUsage
  s.append(devicesUsage)



plt.plot(d)
plt.plot(s)
print s

plt.axis([0, 1500, 0, 3000])
plt.ylabel('WATTS')
plt.show()