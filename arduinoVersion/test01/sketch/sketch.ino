int pin = 13;
volatile int state = LOW;

double lightMillis;
double wireMillis;
bool printed;
bool currentState;

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
    digitalWrite(pin, state);
    if (intencity < 500 && currentState != LOW) {
       lightMillis = millis();
       currentState = LOW;
    } else if(currentState == LOW && intencity > 500) {
       currentState = HIGH;
    }
    
  if (currentState == LOW && lightMillis > 0 && wireMillis > 0) {
    Serial.print("LDR read Time (MS): ");
    Serial.print(lightMillis);
    Serial.print(" | WIRE read Time (MS) ");
    Serial.print(wireMillis);
    Serial.print(" | WIRE - LIGHT (MS): ");
    Serial.println(wireMillis - lightMillis);
    printed = true;
    lightMillis = 0;
    wireMillis = 0;
  }
}

void blink()
{
  wireMillis = millis();
}
