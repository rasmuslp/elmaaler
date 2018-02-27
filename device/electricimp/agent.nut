deviceId <- null;

factorTable <- {
    "236947b930728cee": {
        "pulsesPerKwh": 10000,
        "conversion": 60
    },
    "235c0db930728cee": {
        "pulsesPerKwh": 10000,
        "conversion": 60
    },
    "2322b8b030728cee": {
        "pulsesPerKwh": 10000,
        "conversion": 120
    }
}

pulsesPerKwh <- -1;
conversion <- -1;
jouleFactor <- -1;
bucketFactor <- -1;

const sendTimeInterval = 0;
lastSendTime <- 0;
queuedMessages <- array();
sendInProgress <- false;
bodyInTransit <- false;

seriesStartTimeStamp <- -1;
lastTimeStamp <- -1;
lastTimeDiff <- -1;
currentUsage <- -1;
const bucketSize = 5;
bucketCount <- 0.0;
lastMin <- -1;

device.on("setDeviceId", function(data) {
    deviceId = data.deviceId;

    pulsesPerKwh = 560;
    conversion = 1;
    if (deviceId in factorTable) {
        if ("pulsesPerKwh" in factorTable[deviceId]) {
            pulsesPerKwh = factorTable[deviceId]["pulsesPerKwh"];
        }
        if ("conversion" in factorTable[deviceId]) {
            conversion = factorTable[deviceId]["conversion"];
        }
    }

    // 1 kWh (in s) * ( s to ms / pulses per kWh )
    jouleFactor = 3600 * 1000 * (1000.0/pulsesPerKwh) * conversion
    bucketFactor = conversion * 1000.0/pulsesPerKwh

    lastSendTime = 0;
    queuedMessages = array();
    sendInProgress = false;
    bodyInTransit = false;

    seriesStartTimeStamp = -1;
    lastTimeStamp = -1;
    lastTimeDiff = -1;
    currentUsage = -1;
    bucketCount = 0.0;
    lastMin = -1;
});

device.on("timeStamp", function(data) {
    seriesStartTimeStamp = data.ts;
    lastTimeStamp = -1;
    lastTimeDiff = -1;
    currentUsage = -1;
    bucketCount = 0.0;
    lastMin = -1;

    queueData(data);
});

device.on("timeDiff", function(data) {
    if (seriesStartTimeStamp != -1) {
        local newTimeStamp = seriesStartTimeStamp + data.td / 1000;
        if (lastTimeStamp == -1) {
            lastTimeStamp = newTimeStamp;
        }

        local d = date(newTimeStamp);
        //server.log("Time: " + d.min + ":" + d.sec);
        local newInterval = d.min % bucketSize == 0 ? true : false;
        if (lastMin != d.min && newInterval && lastTimeStamp < newTimeStamp - d.sec ) {
            server.log("New " + bucketSize + " min interval");

            local seconds = newTimeStamp - lastTimeStamp;
            local secNext = d.sec;
            local secPrev = seconds - secNext;

            //server.log("Seconds: " + seconds + " old: " + secPrev + " new: " + secNext);

            local forPrevBucketCount = 1;
            local forNextBucketCount = 0;

            if (seconds > 0) {
                seconds = seconds.tofloat();
                local forPrevBucketCount = secPrev/seconds;
                local forNextBucketCount = 1 - forPrevBucketCount;
            }

            //server.log("Part for old: " + forPrevBucketCount + " and part for new: " + forNextBucketCount);

            bucketCount += bucketFactor * forPrevBucketCount;

            local url = "https://elmaaler.firebaseio.com/bucketsFromBlinkies/" + deviceId + ".json";
            local headers = {
                "Content-Type": "application/json"
            };
            local body = date(newTimeStamp - d.sec);
            body.count <- bucketCount;
            body = http.jsonencode(body);
            local post = http.post(url, headers, body).sendasync(function(data){
                if (data.statuscode != 200) {
                    server.log("Bucket send failed with status code: " + data.statuscode);
                }
            });

            bucketCount = bucketFactor * forNextBucketCount;
            lastMin = d.min;
        } else {
            bucketCount += bucketFactor * 1;
        }

        lastTimeStamp = newTimeStamp;

        if (lastTimeDiff != -1) {
            // jouleFactor * time diff in ms * conversion
            currentUsage = math.floor(jouleFactor / (data.td - lastTimeDiff));
            data.tsFull <- lastTimeStamp;
            data.u <- currentUsage;
        }
    }

    lastTimeDiff = data.td;

    queueData(data);
});

function queueData(data) {
    queuedMessages.push(data);

    // Wait until device id is set
    if (deviceId == null) {
        server.log("No deviceId, cannot transmit: Postponing package: " + http.jsonencode(data));
        return;
    }

    if (sendInProgress) {
        return;
    }
    sendInProgress = true;

    preSendData();
}

function preSendData() {
    if (!bodyInTransit) {
        // Prepare new body
        if (queuedMessages.len() < 1) {
            sendInProgress = false;
            return;
        }

        local single = queuedMessages.remove(0);
        bodyInTransit = http.jsonencode(single);
    }

    sendData();
}

function sendData() {
    local time = time();
    if (time < lastSendTime + sendTimeInterval) {
        //  If time limited, then throttle data
        //server.log("Throtteling data");
        sendInProgress = false;
        return;
    }
    // Not time limited, then send data
    lastSendTime = time;

    // Prepare POST
    local url = "https://elmaaler.firebaseio.com/messagesFromBlinkies/" + deviceId + ".json";
    local headers = {
        "Content-Type": "application/json"
    };

    local post = http.post(url, headers, bodyInTransit).sendasync(sendComplete);
    server.log("Data queued for async transfer: " + bodyInTransit);
}

function sendComplete(requestData) {
    if (requestData.statuscode == 200) {
        // All is good
        bodyInTransit = false;

        // Prepare to send new data
        preSendData();
    } else if (requestData.statuscode == 429) {
        // Rate limit hit
        local retry = requestData.headers["retry-after"];
        server.log("Rate limit hit. Retry after: " + retry);

        // Retransmit old data
        sendData();
    } else if (requestData.statuscode < 100 || 500 <= requestData.statuscode) {
        server.log("Got status code: " + requestData.statuscode + " retrying.");

        // Retransmit old data
        sendData();
    } else {
        server.log("Unknown status code: " + requestData.statuscode);
        bodyInTransit = false;
        sendInProgress = false;
    }
}
