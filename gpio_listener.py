#!/usr/bin/env python3
from gpiozero import Button
import time

# Configura el botón en GPIO16; ajusta pull_up según tu cableado
# Si el botón conecta a GND al presionarse, usa pull_up=True
button = Button(16, pull_up=True, bounce_time=0.2)

button.when_pressed = lambda: print("Button pressed!")
button.when_released = lambda: print("Button released!")

print("Listening on GPIO16. Press Ctrl+C to exit.")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Exiting...")
