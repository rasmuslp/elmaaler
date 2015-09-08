#!/usr/bin/python
# -*- coding: utf-8 -*-

__author__ = 'Rasmus Ljungmann Pedersen'

#from firebase import Firebase

import matplotlib.pyplot as plt
import datetime
import json
import csv

#fb = Firebase('https://elmaaler.firebaseio.com/sensorReadFromDevices/')
#fbDevices = fb.get()

#fileName = 'sensorReadFromDevices-0ms.json' # 394 pulses detected,
#fileName = 'sensorReadFromDevices-0ms-take-3.json' # 1317 (må kunne forbedres)(nyeste sæt) pulses detected,
#fileName = 'sensorReadFromDevices-1ms.json' # 243 pulses detected,
#fileName = 'sensorReadFromDevices-2ms.json' # 304 pulses detected,
#fileName = 'sensorReadFromDevices-2ms-take-2.json' # 1998 pulses detected,
#fileName = 'sensorReadFromDevices-2ms-take-3.json' #
#fileName = 'sensorReadFromDevices-2ms-take-4.json' #
fileName = '/Users/rasmus/Dropbox/Aware - sensorRead/sensorReadFromBlinkies-2ms-oleb.json'
#fileName = 'sensorReadFromDevices-5ms.json' # 182 pulses detected,
jsonFile = open(fileName)
fbDevices = json.load(jsonFile)

devices = {}

for deviceId in fbDevices:
	print 'Found device: ' + deviceId
	dataSets = fbDevices[deviceId]
	devices[deviceId] = {
	'lastTimeStamp': 0,
	'dates': [],
	'values': [],
	}
	for key, dataSet in iter(sorted(dataSets.iteritems())):
		for sensorValueSet in dataSet:
			for sensorValue in sensorValueSet:
				if 'ts' in sensorValue:
					devices[deviceId]['lastTimeStamp'] = sensorValue['ts']
				elif 'td' in sensorValue:
					if len(devices[deviceId]['dates']) > 50000:
						break
					timeStampPre = devices[deviceId]['lastTimeStamp'] * 1000 + sensorValue['td']
					timeStamp = datetime.datetime.fromtimestamp( timeStampPre / 1000 ).replace(
						microsecond = timeStampPre % 1000 * 1000 )
					devices[deviceId]['dates'].append( timeStamp )
					devices[deviceId]['values'].append( sensorValue['v'] )

for deviceId in devices:
	device = devices[deviceId]

	# Pulse detection
	pulses = []
	pulsesOnly = []

	pulseDiff = datetime.timedelta(milliseconds=200)
	triggerStart = 8000
	triggerEnd = 4000
	pulse = False
	pulseTimeStamp = False;
	for i in range(0, len(device['dates'])):
		read = device['values'][i]

		if read > triggerStart:
			if not pulse:
				# Candidate
				pulse = True
				pulseTimeStamp = device['dates'][i]
			elif pulseTimeStamp:
				# Candidate confirmed
				pulses.append(65535)
				pulses.append(0)
				pulsesOnly.append(pulseTimeStamp)
				pulseTimeStamp = False
			else:
				pulses.append(0)
		else:
			if pulseTimeStamp:
				# Candidate disproved
				pulseTimeStamp = False
				pulses.append(0)
				pulses.append(0)
			else:
				pulses.append(0)

		if read < triggerEnd:
			pulse = False
			pulseTimeStamp = False


	print 'Points: ' + str(len(device['dates']))
	print 'Pulses: ' + str(len(pulses))
	if len(device['dates']) != len(pulses):
		print 'Error: No. points in data is ' + str(len(device['dates'])) + ' but pulse graph has  ' + str(len(pulses)) + ' points'

	print 'Pulses detected for Blinky ' + deviceId + ' (' + fileName + '): ' + str(len(pulsesOnly))
	for i in range(0, len(pulsesOnly)):
		if i > 0:
			diff = pulsesOnly[i] - pulsesOnly[i-1]
			if diff < pulseDiff:
				print 'Short diff! At ' + str(pulsesOnly[i-1]) + ' and ' + str(pulsesOnly[i])

	# csvOut = csv.writer(open(deviceId+'.csv', 'wb'))
	# csvOut.writerow(['date', 'value'])
	# for i in range(0, len(device['dates'])):
	# 	csvOut.writerow([device['dates'][i], device['values'][i]])


	fig = plt.figure()
	fig.suptitle(fileName, fontsize=20)
	plt.xlabel('Date', fontsize=18)
	plt.ylabel('Value', fontsize=16)
	plt.plot(device['dates'], device['values'], '.r-')
	#plt.plot(device['dates'], pulses, 'og-')
	plt.show()
