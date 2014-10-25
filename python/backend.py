__author__ = 'Rasmus Ljungmann Pedersen'

from firebase import Firebase
from sseclient import SSEClient

import datetime
import json

FB_URL = 'https://elmaaler.firebaseio.com/'

# Load information about devices
devicesFb = Firebase(FB_URL + 'devices')
devices = devicesFb.get()
if devices is None:
    print 'Devices does not exist on Firebase'
    devices = {}

# Load data model
dataFb = Firebase(FB_URL + 'data')
data = dataFb.get()
if data is None:
    print 'Data does not exist on Firebase'
    data = {}

buckets = {
    'years': {}
}

def addPointToBucketForData(id, timeStamp):
    # Construct keys if non existant
    if not 'years' in buckets:
        #TODO: Log / fix
        print 'Oops, buckets not initialised!'
        return

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

def setLastTimeStampForDevice(id, timeStamp):
    deviceFb = Firebase(FB_URL + 'devices/' + id)
    deviceFb.patch({
        'lastTimeStamp': timeStamp
    })

    # HAX: Overriding devices (might not be safe in the future)
    devices = devicesFb.get()

def newTimeDiffFromDevice(id, timeDiff):
    global devices

    if not id in devices:
        #TODO: LOG
        print 'No device with id ' + id + '. Skipping...'
        return

    if not 'lastTimeStamp' in devices[id]:
        #TODO: LOG
        print 'No lastTimeStamp for device with id ' + id + '. Skipping...'
        return

    initData = False
    if not 'dataKey' in devices[id]:
        #TODO: LOG
        print 'No dataKey for device with id ' + id + '. Creating...'
        dataRef = dataFb.push({
            'dummy': True,
            'buckets': {
                'years': {}
            }
        })
        deviceFb = Firebase(FB_URL + 'devices/' + id)
        deviceFb.patch({
            'dataKey': dataRef['name']
        })
        devices = deviceFb.get()
        initData = True

    #print 'Devices: ' + json.dumps(devices)

    timeStampPre = devices[id]['lastTimeStamp'] * 1000 + timeDiff
    timeStamp = datetime.datetime.fromtimestamp(timeStampPre/1000).replace(microsecond=timeStampPre % 1000 * 1000)

    #if initData:
    #    addPointToBucketForData({}, timeStamp)

    if id == '23436f3643fc42ee':
        addPointToBucketForData(id, timeStamp)

def messageFromDevice(event, id, message):
    print 'Event: ' + event + ' id: ' + id + ' message: ' + json.dumps(message)

    if 'timeStamp' in message:
        setLastTimeStampForDevice(id, message['timeStamp'])
    elif 'timeDiff' in message:
        newTimeDiffFromDevice(id, message['timeDiff'])

def pushDataToFB():
    print 'Pushing data to FB...'
    bucketFB = Firebase(FB_URL + 'buckets')
    bucketFB.put(buckets)
    print 'Pushing data to FB... Done'

def main():
    messagesFromDevices = SSEClient(FB_URL + 'messagesFromDevices.json')
    for sseEvent in messagesFromDevices:
        # Read content of event
        event = sseEvent.event
        payload = json.loads(sseEvent.data)

        # Keep-alive, ignoring for now
        if payload is None:
            continue

        path = payload['path']
        data = payload['data']

        if path == '/':
            # Data from multiple devices
            for deviceId in data.keys():
                deviceMessages = data[deviceId]
                for key, message in iter(sorted(deviceMessages.iteritems())):
                    #TODO: There must be a better way to do this that only gives the value and is sorted on key
                    messageFromDevice(event, deviceId, message)
            pushDataToFB()
        else:
            # Assuming single message
            messageFromDevice(event, path.split('/')[1], data)
            pushDataToFB()

main()
