server.log("Blinky started (version: " + imp.getsoftwareversion() + ")");

// Configure sensor
sensor <- hardware.pin1;
sensor.configure(ANALOG_IN);

seriesStartTimeStamp <- null;
seriesStartTimeDiff <- null;
//TODO: timeDiff _will_ overflow after ~25 days
pulse <- false;
pulseData <- -1;

const triggerStart = 10000;
const triggerEnd = 4000;

agent.send("setDeviceId", {"deviceId":  hardware.getdeviceid()});

function prePulse(read) {
    local timeDiff = hardware.millis();
    if (seriesStartTimeStamp == null) {
        seriesStartTimeStamp = time();
        seriesStartTimeDiff = timeDiff;
        agent.send("timeStamp", {
            "ts": seriesStartTimeStamp
        });
    }

    return {
        "td": timeDiff - seriesStartTimeDiff,
        "v": read
    }
}

function poll() {
    imp.onidle(poll);

    // Read sensor
    local read = sensor.read();
    if (read > triggerStart) {
        if (!pulse) {
            // Candidate
            pulse = true;
            pulseData = prePulse(read);
        } else if (pulseData != -1) {
            // Candidate confirmed => pulse
            agent.send("timeDiff", pulseData);
            pulseData = -1;
        }
    } else {
        if (pulseData != -1) {
            // Candidate disproved
            pulseData = -1;
        }
    }

    if (read < triggerEnd){
        // Pulse ended
        pulse = false;
        pulseData = -1
    }
}

imp.onidle(poll);
