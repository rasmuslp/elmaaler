int pin = 13;
volatile int state = LOW;

double lightMillis;
double wireMillis;
bool printed;
bool currentState;

int oldTimestamp;

void setup()
{
  pinMode(pin, OUTPUT);
  pinMode(A0, INPUT);
  
  
  attachInterrupt(0, blink, CHANGE);
  Serial.begin(9600);
}

void loop()
{
    int intencity = analogRead(A0);
    //Serial.println(intencity);
    digitalWrite(pin, state);
    if (intencity < 800 && currentState != LOW) {
       lightMillis = millis();
         //Serial.print("LDR read Time (MS): ");
         //Serial.println(lightMillis);
         Serial.print("Current usage: ");
         Serial.println(oldTimestamp-lightMillis/oldTimestamp);
         oldTimestamp = lightMillis;
         currentState = LOW;

    
  } else if(currentState == LOW && intencity > 800) {
     currentState = HIGH;
    }
}

void blink()
{
  wireMillis = millis();
    Serial.print(" | WIRE read Time (MS) ");
    Serial.print(wireMillis);
}
