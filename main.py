import requests
from datetime import datetime as dt
from flask import Flask, render_template, jsonify

app = Flask(__name__)
DELAY = 30
data = {}

@app.route("/api/flights")
def get_plane():
    global data
    if not data or (dt.now() - data["time"]).seconds >= DELAY:
        data["time"] = dt.now()
        data["planes"] = requests.get("https://opensky-network.org/api/states/all").json()
        print("✈️")
    return jsonify(data["planes"].get("states", []))

@app.route('/')
def index():
    return render_template('earth3D.html')

if __name__ == '__main__':
    app.run(port=8080, host="127.0.0.1", debug=True)
