__author__ = 'Rasmus Ljungmann Pedersen'

from firebase import Firebase
from sseclient import SSEClient

import datetime
import json

LOADTEST = False

devices = {}
data = {}

if not LOADTEST:
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

def addPointToHistoryForData(dataKey, timeStamp):
    # Construct keys if non existant
    if not dataKey in data:
        data[dataKey] = {}

    if not 'history' in data[dataKey]:
        data[dataKey]['history'] = {
            'years': {}
        }

    if not timeStamp.year in data[dataKey]['history']['years']:
        data[dataKey]['history']['years'][timeStamp.year] = {
            'usage': 0.0,
            'months': {}
        }

    if not timeStamp.month in data[dataKey]['history']['years'][timeStamp.year]['months']:
        data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month] = {
            'usage': 0.0,
            'days': {}
        }

    if not timeStamp.day in data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days']:
        data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day] = {
            'usage': 0.0,
            'hours': {}
        }

    if not timeStamp.hour in data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours']:
        data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour] = {
            'usage': 0.0,
            'minutes': {}
        }

    if not timeStamp.minute in data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes']:
        data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes'][timeStamp.minute] = {
            'usage': 0.0
        }

    data[dataKey]['history']['years'][timeStamp.year]['usage'] += 1
    data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['usage'] += 1
    data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['usage'] += 1
    data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['usage'] += 1
    data[dataKey]['history']['years'][timeStamp.year]['months'][timeStamp.month]['days'][timeStamp.day]['hours'][timeStamp.hour]['minutes'][timeStamp.minute]['usage'] += 1

def setLastTimeStampForDevice(deviceId, timeStamp):
    global devices

    if LOADTEST:
        devices[deviceId] = {}
        devices[deviceId]['lastTimeStamp'] = timeStamp
    else:
        devicesFb.child(deviceId).patch({
            'lastTimeStamp': timeStamp
        })

        # HAX: Overriding devices (might not be safe in the future)
        devices = devicesFb.get()

def newTimeDiffFromDevice(deviceId, timeDiff):
    global devices

    if not deviceId in devices:
        #TODO: LOG
        print 'No device with id ' + deviceId + '. Skipping...'
        return

    if not 'lastTimeStamp' in devices[deviceId]:
        #TODO: LOG
        print 'No lastTimeStamp for device with id ' + deviceId + '. Skipping...'
        return

    initData = False
    if not 'dataKey' in devices[deviceId]:
        #TODO: LOG
        initData = True
        print 'No dataKey for device with id ' + deviceId + '. Creating...'

        if LOADTEST:
            dataKey = len(data)
            data[dataKey] = {}
            devices[deviceId]['dataKey'] = dataKey
        else:
            dataRef = dataFb.push({
                'dummy': True
            })
            devicesFb.child(deviceId).patch({
                'dataKey': dataRef['name']
            })
            devices = devicesFb.get()

    timeStampPre = devices[deviceId]['lastTimeStamp'] * 1000 + timeDiff
    timeStamp = datetime.datetime.fromtimestamp(timeStampPre/1000).replace(microsecond=timeStampPre % 1000 * 1000)

    dataKey = devices[deviceId]['dataKey']
    addPointToHistoryForData(dataKey, timeStamp)

    if initData:
        pushDataToFB(deviceId)
        #dataFb.child(dataKey).child('dummy').delete()

def messageFromDevice(event, deviceId, message):
    print 'Event: ' + event + ' id: ' + deviceId + ' message: ' + json.dumps(message)

    if 'timeStamp' in message:
        setLastTimeStampForDevice(deviceId, message['timeStamp'])
    elif 'timeDiff' in message:
        newTimeDiffFromDevice(deviceId, message['timeDiff'])

def pushDataToFB(deviceId):
    if LOADTEST:
        print 'Not pushing to FB'
        return
    else:
        print 'Pushing data to FB...'
        dataKey = devices[deviceId]['dataKey']
        dataFb.child(dataKey).put(data[dataKey])
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
                pushDataToFB(deviceId)
        else:
            # Assuming single message
            deviceId = path.split('/')[1]
            messageFromDevice(event, deviceId, data)
            pushDataToFB(deviceId)

if LOADTEST:
    jsonFile = open('test-data.json')
    jsonData = json.load(jsonFile)

    for deviceId in jsonData['messagesFromDevices']:
        for messageKey in jsonData['messagesFromDevices'][deviceId]:
            message = jsonData['messagesFromDevices'][deviceId][messageKey]
            messageFromDevice('Loaded message', deviceId, message)

    print 'Devices:'
    print devices
    print 'Data:'
    print data
else:
    main()
