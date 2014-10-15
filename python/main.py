
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

    if (abs(usage - lastUsage) > 1):
      d.append(usage)
    lastUsage = usage
    prevTime = dataPoint['timeDiff']

print "CurrentUsage from timeDiff conversion DONE"

lastUsage = 0
xvaluesToMeta = []
subDevices = {}
tempDec = []
allDevices = []
de = [0] * 10
for i in range(len(d)):
  usage = d[i]
  if (abs(usage - lastUsage) > 100):
    response = simulated_annealing.solve( 1, 1, usage )
    devicesUsage = response['totalConsume']

    for device in response['devices']:
      de[device] = response['allDevices'][device].consumption_mean
    allDevices.append(de)
    de = [0] * 10

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
  r = f.push(allDevices)
  print "Firebase Response :";
  print r

import numpy as np
from matplotlib import pyplot as plt

print "______________________ ALL DEVICES:_____________________"
print allDevices
print len(allDevices)

y = np.array(np.transpose(allDevices))
print "______________________ Y VALUE:_____________________"
print y
print len(y)

x = np.arange(10)
print "______________________ X VALUE:_____________________"
print x
print len(xvaluesToMeta)

# Make new array consisting of fractions of column-totals,
# using .astype(float) to avoid integer division
percent = y /  y.sum(axis=0).astype(float) * 100

plt.stackplot(xvaluesToMeta, y)


#plt.plot(xvaluesToMeta,allDevices)
plt.plot(xvaluesToMeta, s)
plt.plot(d)

plt.axis([0, len(d), 0, 3000])
plt.ylabel('WATTS')
plt.show()
