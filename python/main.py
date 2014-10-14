from metaheuristic import hill_climber, simulated_annealing
# import requests
# import json
# r = requests.get('https://elmaaler.firebaseio.com/users')
# print r.json()

from firebase import Firebase
import matplotlib.pyplot as plt
import json
import numpy as np


f = Firebase('https://elmaaler.firebaseio.com/device/23436f3643fc42ee/data/incoming/raw2')
r = f.get()
d = []
i = 0
s = []

prevTime = 0


lastUsage = 0
dtimeStamps = []
for key , dataPoint in iter(sorted(r.iteritems())):
  currentTime = dataPoint['timeDiff']
  if (i == 2):
    prevTime=currentTime
  i = i + 1
  if (prevTime != 0):
    time = currentTime-prevTime-1
    time = time / 1000.0
    usage = 3600 / time

    if (abs(usage - lastUsage) > 0):
      d.append(usage)
    lastUsage = usage
    prevTime = dataPoint['timeDiff']

print "CurrentUsage from timeDiff conversion DONE"

lastUsage = 0
xvaluesToMeta = []
subDevices = {}
tempDec = []
for i in range(len(d)):
  usage = d[i]
  if (abs(usage - lastUsage) > 50):
    response = simulated_annealing.solve( 1, 1, usage )
    devicesUsage = response['totalConsume']
    for device in response['devices']:
      c = devicesUsage / len(response['devices'])
      tempDec.append(c)
    subDevices[i] = tempDec
    tempDec = []
    s.append(devicesUsage)
    xvaluesToMeta.append(i)
  lastUsage = usage
  #print devicesUsage
  #devicesUsage = 10



var = raw_input("Save to firebase? YES/NO: ")
if (var == "YES"):
  f = Firebase('https://elmaaler.firebaseio.com/device/23436f3643fc42ee/data/computed/raw2')
  r = f.push(s)
  print "Firebase Response :";
  print r

N = 5
menMeans   = (20, 35, 30, 35, 27)
womenMeans = (25, 32, 34, 20, 25)
menStd     = (2, 3, 4, 1, 2)
womenStd   = (3, 5, 2, 3, 3)
ind = np.arange(N)    # the x locations for the groups
width = 1.35       # the width of the bars: can also be len(x) sequence

print subDevices
for key, device in subDevices.iteritems():
    print device

p1 = plt.bar(xvaluesToMeta, s)
plt.plot(d)
#plt.plot(xvaluesToMeta, s)
print s

plt.axis([0, len(d), 0, 3000])
plt.ylabel('WATTS')
plt.show()