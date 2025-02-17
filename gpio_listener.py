#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import requests

# Configurar la numeración BCM y el GPIO16 con pull-down
GPIO.setmode(GPIO.BCM)
GPIO.setup(16, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# Usamos localhost ya que el servidor corre en la misma máquina
SERVER_URL = "http://localhost:3000/push-to-talk"

def button_callback(channel):
    state = GPIO.input(channel)
    if state == 1:
        print("Button pressed: push-to-talk START")
        try:
            r = requests.get(SERVER_URL, params={"state": "1"})
            print("Response:", r.text)
        except Exception as e:
            print("Error sending request:", e)
    else:
        print("Button released: push-to-talk STOP")
        try:
            r = requests.get(SERVER_URL, params={"state": "0"})
            print("Response:", r.text)
        except Exception as e:
            print("Error sending request:", e)

GPIO.add_event_detect(16, GPIO.BOTH, callback=button_callback, bouncetime=200)

try:
    print("Listening on GPIO16. Press Ctrl+C to exit.")
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Exiting...")
finally:
    GPIO.cleanup()
