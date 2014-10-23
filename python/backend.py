__author__ = 'rasmus'

from firebase import Firebase
from sseclient import SSEClient

import json
import numpy as np
import datetime

#sseClient = SSEClient('https://elmaaler.firebaseio.com/device/23436f3643fc42ee/data/incoming/raw.json')
sseClient = SSEClient('https://elmaaler.firebaseio.com/users.json')
for fbEvent in sseClient:
    msgEvent = fbEvent.event
    msgData = json.loads(fbEvent.data)
    if msgData is None:
        # keep-alive, ignoring for now
        print 'Keep-alive ? ' + msgEvent
        continue

    print 'Event: ' + fbEvent.event + ' data: ' + json.dumps(msgData)




buckets = {
    'years': {}
}

def addPointToBucket(timeStamp):
    if timeStamp == None:
        return

    # Construct keys if non existant

    if not timeStamp.year in buckets['years']:
        buckets['years'][timeStamp.year] = {
            'usage': 0.0,
            'months': {}
        }

    if not timeStamp.month in buckets['years'][timeStamp.year]['months']:
        buckets['years'][timeStamp.year]['months'][timeStamp.month] = {
            'usage': 0.0,
            'days': {}
        }

    if not timeStamp.day in buckets['years'][timeStamp.year]['months'][timeStamp.month]['days']:
        buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day] = {
            'usage': 0.0,
            'hours': {}
        }

    if not timeStamp.hour in buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours']:
        buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour] = {
            'usage': 0.0,
            'minutes': {}
        }

    if not timeStamp.minute in buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes']:
        buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes'][timeStamp.minute] = {
            'usage': 0.0
        }

    buckets['years'][timeStamp.year]['usage'] += 1
    buckets['years'][timeStamp.year]['months'][timeStamp.month]['usage'] += 1
    buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['usage'] += 1
    buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['usage'] += 1
    buckets['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes'][timeStamp.minute]['usage'] += 1






# Read live data
f = Firebase('https://elmaaler.firebaseio.com/device/23436f3643fc42ee/data/incoming/raw')
rawData = f.get()
startTimeStamp = -1

for key, dataPoint in iter(sorted(rawData.iteritems())):
    if 'timeStamp' in dataPoint:
        startTimeStamp = dataPoint['timeStamp']
    elif 'timeDiff' in dataPoint:
        # Skipping timeDiffs with no prior timeStamp
        if startTimeStamp == -1:
            #LOG
            continue

        dataPointTimeStamp = startTimeStamp * 1000 + dataPoint['timeDiff']
        lastTimeStamp = datetime.datetime.fromtimestamp(dataPointTimeStamp/1000).replace(microsecond=dataPointTimeStamp % 1000 * 1000)
        addPointToBucket(lastTimeStamp)

print 'Buckets'
print json.dumps(buckets, indent=2)