#!/usr/bin/env python3
from gpiozero import Button
import time
import requests

# URL del endpoint del servidor (en este caso, localhost en el puerto 3000)
SERVER_URL = "http://localhost:3000/push-to-talk"

def log_and_send(state):
    current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    if state:
        print(f"{current_time} - Button pressed: push-to-talk START")
        try:
            response = requests.get(SERVER_URL, params={"state": "1"})
            print(f"{current_time} - Response: {response.text}")
        except Exception as e:
            print(f"{current_time} - Error sending request: {e}")
    else:
        print(f"{current_time} - Button released: push-to-talk STOP")
        try:
            response = requests.get(SERVER_URL, params={"state": "0"})
            print(f"{current_time} - Response: {response.text}")
        except Exception as e:
            print(f"{current_time} - Error sending request: {e}")

# Configura el botón en GPIO16.
# Dado que tu prueba mínima funcionó con pull_up activado, usamos pull_up=True.
button = Button(16, pull_up=True, bounce_time=0.2)

# Asigna las funciones a los eventos del botón
button.when_pressed = lambda: log_and_send(True)
button.when_released = lambda: log_and_send(False)

print("Listening on GPIO16. Press Ctrl+C to exit.")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Exiting...")
