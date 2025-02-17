#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import requests

# Configurar la numeración BCM y el GPIO16 con pull-down
GPIO.setmode(GPIO.BCM)
GPIO.setup(16, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

SERVER_URL = "http://localhost:3000/push-to-talk"

def button_callback(channel):
    state = GPIO.input(channel)
    current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    if state == 1:
        print(f"{current_time} - Button pressed: push-to-talk START")
        try:
            r = requests.get(SERVER_URL, params={"state": "1"})
            print(f"{current_time} - Response: {r.text}")
        except Exception as e:
            print(f"{current_time} - Error sending request: {e}")
    else:
        print(f"{current_time} - Button released: push-to-talk STOP")
        try:
            r = requests.get(SERVER_URL, params={"state": "0"})
            print(f"{current_time} - Response: {r.text}")
        except Exception as e:
            print(f"{current_time} - Error sending request: {e}")

GPIO.add_event_detect(16, GPIO.BOTH, callback=button_callback, bouncetime=200)

try:
    print("Listening on GPIO16. Press Ctrl+C to exit.")
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Exiting...")
finally:
    GPIO.cleanup()
