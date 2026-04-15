import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomSpeed = 0.8;
controls.enableZoom = true;
controls.zoomSpeed = 0.5;
controls.minDistance = 1.2;
controls.maxDistance = 8.0;

const textureLoader = new THREE.TextureLoader();
const earthMap = textureLoader.load("static/earth.jpg");

const geometry = new THREE.SphereGeometry(1, 128, 128);
const material = new THREE.MeshStandardMaterial({ map: earthMap });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

const starGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i*3] = (Math.random() - 0.5) * 2000;
    starPositions[i*3+1] = (Math.random() - 0.5) * 2000;
    starPositions[i*3+2] = (Math.random() - 0.5) * 2000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);
const backLight = new THREE.DirectionalLight(0x444444, 0.5);
backLight.position.set(-3, -1, -4);
scene.add(backLight);

let planeGroup = new THREE.Group();
scene.add(planeGroup);
let aircraftsList = [];
let currentFlightData = new Map();

const airports = [
    { name: "Sheremetyevo (SVO)", code: "SVO", lat: 55.9726, lon: 37.4146, city: "Moscow", country: "Russia" },
    { name: "Domodedovo (DME)", code: "DME", lat: 55.4088, lon: 37.9063, city: "Moscow", country: "Russia" },
    { name: "Vnukovo (VKO)", code: "VKO", lat: 55.5916, lon: 37.2615, city: "Moscow", country: "Russia" },
    { name: "Zhukovsky (ZIA)", code: "ZIA", lat: 55.5533, lon: 38.1500, city: "Moscow", country: "Russia" },

    { name: "Heathrow (LHR)", code: "LHR", lat: 51.4700, lon: -0.4543, city: "London", country: "UK" },
    { name: "Charles de Gaulle (CDG)", code: "CDG", lat: 49.0097, lon: 2.5479, city: "Paris", country: "France" },
    { name: "Frankfurt (FRA)", code: "FRA", lat: 50.0379, lon: 8.5622, city: "Frankfurt", country: "Germany" },
    { name: "Amsterdam Schiphol (AMS)", code: "AMS", lat: 52.3086, lon: 4.7639, city: "Amsterdam", country: "Netherlands" },
    { name: "Istanbul (IST)", code: "IST", lat: 41.2600, lon: 28.7420, city: "Istanbul", country: "Turkey" },
    { name: "Madrid-Barajas (MAD)", code: "MAD", lat: 40.4983, lon: -3.5676, city: "Madrid", country: "Spain" },
    { name: "Barcelona (BCN)", code: "BCN", lat: 41.2971, lon: 2.0785, city: "Barcelona", country: "Spain" },
    { name: "Munich (MUC)", code: "MUC", lat: 48.3538, lon: 11.7861, city: "Munich", country: "Germany" },
    { name: "Rome Fiumicino (FCO)", code: "FCO", lat: 41.8003, lon: 12.2389, city: "Rome", country: "Italy" },
    { name: "Zurich (ZRH)", code: "ZRH", lat: 47.4647, lon: 8.5492, city: "Zurich", country: "Switzerland" },

    { name: "Hartsfield-Jackson (ATL)", code: "ATL", lat: 33.6407, lon: -84.4277, city: "Atlanta", country: "USA" },
    { name: "Los Angeles (LAX)", code: "LAX", lat: 33.9416, lon: -118.4085, city: "Los Angeles", country: "USA" },
    { name: "Chicago O'Hare (ORD)", code: "ORD", lat: 41.9742, lon: -87.9073, city: "Chicago", country: "USA" },
    { name: "John F. Kennedy (JFK)", code: "JFK", lat: 40.6413, lon: -73.7781, city: "New York", country: "USA" },
    { name: "Toronto Pearson (YYZ)", code: "YYZ", lat: 43.6777, lon: -79.6248, city: "Toronto", country: "Canada" },
    { name: "Mexico City (MEX)", code: "MEX", lat: 19.4363, lon: -99.0721, city: "Mexico City", country: "Mexico" },
    { name: "San Francisco (SFO)", code: "SFO", lat: 37.6213, lon: -122.3790, city: "San Francisco", country: "USA" },
    { name: "Miami (MIA)", code: "MIA", lat: 25.7932, lon: -80.2906, city: "Miami", country: "USA" },

    { name: "Dubai (DXB)", code: "DXB", lat: 25.2528, lon: 55.3644, city: "Dubai", country: "UAE" },
    { name: "Tokyo Haneda (HND)", code: "HND", lat: 35.5494, lon: 139.7798, city: "Tokyo", country: "Japan" },
    { name: "Beijing Capital (PEK)", code: "PEK", lat: 40.0799, lon: 116.6031, city: "Beijing", country: "China" },
    { name: "Shanghai Pudong (PVG)", code: "PVG", lat: 31.1443, lon: 121.8083, city: "Shanghai", country: "China" },
    { name: "Singapore Changi (SIN)", code: "SIN", lat: 1.3644, lon: 103.9915, city: "Singapore", country: "Singapore" },
    { name: "Hong Kong (HKG)", code: "HKG", lat: 22.3080, lon: 113.9185, city: "Hong Kong", country: "China" },
    { name: "Seoul Incheon (ICN)", code: "ICN", lat: 37.4602, lon: 126.4407, city: "Seoul", country: "South Korea" },
    { name: "Delhi (DEL)", code: "DEL", lat: 28.5562, lon: 77.1000, city: "Delhi", country: "India" },
    { name: "Bangkok Suvarnabhumi (BKK)", code: "BKK", lat: 13.6811, lon: 100.7470, city: "Bangkok", country: "Thailand" },
    { name: "Kuala Lumpur (KUL)", code: "KUL", lat: 2.7456, lon: 101.7099, city: "Kuala Lumpur", country: "Malaysia" },

    { name: "Doha Hamad (DOH)", code: "DOH", lat: 25.2731, lon: 51.6081, city: "Doha", country: "Qatar" },
    { name: "Abu Dhabi (AUH)", code: "AUH", lat: 24.4330, lon: 54.6511, city: "Abu Dhabi", country: "UAE" },

    { name: "Sydney (SYD)", code: "SYD", lat: -33.9399, lon: 151.1753, city: "Sydney", country: "Australia" },
    { name: "Melbourne (MEL)", code: "MEL", lat: -37.6733, lon: 144.8433, city: "Melbourne", country: "Australia" },
    { name: "Auckland (AKL)", code: "AKL", lat: -37.0081, lon: 174.7917, city: "Auckland", country: "New Zealand" },

    { name: "Cairo (CAI)", code: "CAI", lat: 30.1219, lon: 31.4056, city: "Cairo", country: "Egypt" },
    { name: "Johannesburg (JNB)", code: "JNB", lat: -26.1392, lon: 28.2460, city: "Johannesburg", country: "South Africa" },
    { name: "Addis Ababa (ADD)", code: "ADD", lat: 8.9779, lon: 38.7993, city: "Addis Ababa", country: "Ethiopia" },

    { name: "São Paulo-Guarulhos (GRU)", code: "GRU", lat: -23.4356, lon: -46.4731, city: "São Paulo", country: "Brazil" },
    { name: "Buenos Aires (EZE)", code: "EZE", lat: -34.8222, lon: -58.5358, city: "Buenos Aires", country: "Argentina" },
    { name: "Santiago (SCL)", code: "SCL", lat: -33.3930, lon: -70.7858, city: "Santiago", country: "Chile" },
    { name: "Bogotá (BOG)", code: "BOG", lat: 4.7016, lon: -74.1469, city: "Bogotá", country: "Colombia" }
];

let airportGroup = new THREE.Group();
scene.add(airportGroup);

function createAirportMarker(lat, lon, name, code, city, country) {
    const pos = latLonToXYZ(lat, lon, 1.005);
    const sphereGeometry = new THREE.SphereGeometry(0.008, 16, 16);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0x3399ff,
        emissive: 0x004466,
        emissiveIntensity: 0.3,
        metalness: 0.7,
        roughness: 0.3
    });
    const marker = new THREE.Mesh(sphereGeometry, sphereMaterial);
    marker.position.copy(pos);

    const glowGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3399ff,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    marker.add(glow);

    marker.userData = {
        type: 'airport',
        name: name,
        code: code,
        city: city,
        country: country,
        lat: lat,
        lon: lon
    };

    return marker;
}

function addAirports() {
    airports.forEach(airport => {
        const marker = createAirportMarker(
            airport.lat,
            airport.lon,
            airport.name,
            airport.code,
            airport.city,
            airport.country
        );
        airportGroup.add(marker);
    });
    console.log(`Добавлено ${airports.length} аэропортов`);
}

function updateAirportsScale() {
    const distance = camera.position.length();
    let scale = 0.05 * Math.pow(distance / 1.5, 2);
    scale = Math.min(0.6, Math.max(0.003, scale));

    const airportScale = scale * 1.5;

    airportGroup.children.forEach(marker => {
        marker.scale.set(airportScale, airportScale, airportScale);
    });
}

function latLonToXYZ(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = -(lon * Math.PI / 180);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

function createAircraft() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.02);
    shape.lineTo(0.015, -0.01);
    shape.lineTo(-0.015, -0.01);
    shape.lineTo(0, 0.02);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
    const triangle = new THREE.Mesh(geometry, material);
    return triangle;
}

function updateAircraftsScale() {
    const distance = camera.position.length();
    let scale = 0.05 * Math.pow(distance / 1.5, 2);
    scale = Math.min(0.6, Math.max(0.003, scale));

    aircraftsList.forEach(aircraft => {
        aircraft.scale.set(scale, scale, scale);
    });

    updateAirportsScale();

    const zoomPercent = Math.round((3 / distance) * 100);
    const clampedZoom = Math.min(250, Math.max(38, zoomPercent));
    document.getElementById('zoom-info').innerHTML = `Приближение: ${clampedZoom}% | Размер объектов: ${(scale * 100).toFixed(1)}px`;
}

window.showInfoPanel = function(flightInfo, callsign) {
    const panel = document.getElementById('info-panel');

    const altitudeFeet = flightInfo.altitude || 0;
    const altitudeKm = (altitudeFeet * 0.3048 / 1000).toFixed(1);
    const speedKnots = flightInfo.velocity || 0;
    const speedKmh = (speedKnots * 1.852).toFixed(0);
    const heading = Math.round(flightInfo.heading || 0);
    const lat = flightInfo.latitude?.toFixed(4) || 'Н/Д';
    const lon = flightInfo.longitude?.toFixed(4) || 'Н/Д';

    panel.innerHTML = `
        <span class="close" onclick="hideInfoPanel()">✕</span>
        <h3>${callsign || flightInfo.callsign || 'Неизвестный рейс'}</h3>
        <hr>
        <p><span class="info-label">ICAO24:</span> ${flightInfo.icao24 || 'Н/Д'}</p>
        <p><span class="info-label">Страна:</span> ${flightInfo.origin_country || 'Н/Д'}</p>
        <p><span class="info-label">Координаты:</span><br> ${lat}°, ${lon}°</p>
        <p><span class="info-label">Высота:</span> ${altitudeKm} км (${Math.round(altitudeFeet)} футов)</p>
        <p><span class="info-label">Скорость:</span> ${speedKmh} км/ч (${Math.round(speedKnots)} узлов)</p>
        <p><span class="info-label">Курс:</span> ${heading}°</p>
    `;

    panel.classList.add('show');
}

window.showAirportInfo = function(airportData) {
    const panel = document.getElementById('info-panel');

    panel.innerHTML = `
        <span class="close" onclick="hideInfoPanel()">✕</span>
        <h3>🛬 ${airportData.name}</h3>
        <hr>
        <p><span class="info-label">Код IATA:</span> ${airportData.code}</p>
        <p><span class="info-label">Город:</span> ${airportData.city}</p>
        <p><span class="info-label">Страна:</span> ${airportData.country}</p>
        <p><span class="info-label">Координаты:</span><br> ${airportData.lat.toFixed(4)}°, ${airportData.lon.toFixed(4)}°</p>
        <hr>
        <p style="font-size: 11px; color: #aaa;">Крупный международный аэропорт</p>
    `;

    panel.classList.add('show');
}

window.hideInfoPanel = function() {
    const panel = document.getElementById('info-panel');
    panel.classList.remove('show');
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const planeIntersects = raycaster.intersectObjects(planeGroup.children, true);

    const airportIntersects = raycaster.intersectObjects(airportGroup.children, true);

    if (planeIntersects.length > 0) {
        let clickedObject = planeIntersects[0].object;
        while (clickedObject.parent !== planeGroup && clickedObject.parent !== null) {
            clickedObject = clickedObject.parent;
        }

        const icao24 = clickedObject.userData?.icao24;
        const callsign = clickedObject.userData?.callsign;

        if (icao24) {
            const flightInfo = currentFlightData.get(icao24);
            if (flightInfo) {
                showInfoPanel(flightInfo, callsign);
            } else {
                const panel = document.getElementById('info-panel');
                panel.innerHTML = `
                    <span class="close" onclick="hideInfoPanel()">✕</span>
                    <h3>✈️ ${callsign || 'Неизвестный рейс'}</h3>
                    <hr>
                    <p><span class="info-label">ICAO24:</span> ${icao24}</p>
                    <p><span class="info-label">Данные:</span> Временная недоступность</p>
                `;
                panel.classList.add('show');
            }
        }
    } else if (airportIntersects.length > 0) {
        let clickedObject = airportIntersects[0].object;
        while (clickedObject.parent !== airportGroup && clickedObject.parent !== null) {
            clickedObject = clickedObject.parent;
        }

        if (clickedObject.userData && clickedObject.userData.type === 'airport') {
            showAirportInfo(clickedObject.userData);
        }
    }
}

async function updateAircrafts() {
    try {
        const response = await fetch('/api/flights');
        const data = await response.json();

        const states = Array.isArray(data) ? data : [];

        const statusDiv = document.getElementById('status');
        statusDiv.innerHTML = `Самолётов: ${states.length} | Аэропортов: ${airports.length}`;

        currentFlightData.clear();
        states.forEach(state => {
            const icao24 = state[0];
            if (icao24) {
                currentFlightData.set(icao24, {
                    icao24: icao24,
                    callsign: state[1] || 'Н/Д',
                    origin_country: state[2] || 'Н/Д',
                    longitude: state[5],
                    latitude: state[6],
                    altitude: state[7],
                    velocity: state[9],
                    heading: state[10]
                });
            }
        });

        while(planeGroup.children.length > 0) {
            planeGroup.remove(planeGroup.children[0]);
        }
        aircraftsList = [];

        states.forEach(state => {
            const lon = state[5];
            const lat = state[6];
            const icao24 = state[0];
            const callsign = state[1];

            if (lon !== null && lat !== null && icao24) {
                const pos = latLonToXYZ(lat, lon, 1.01);
                const aircraft = createAircraft();
                aircraft.position.copy(pos);
                aircraft.lookAt(pos.clone().multiplyScalar(2));

                aircraft.userData = {
                    icao24: icao24,
                    callsign: callsign || '???'
                };

                planeGroup.add(aircraft);
                aircraftsList.push(aircraft);
            }
        });

        updateAircraftsScale();

    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('status').innerHTML = '❌ Ошибка подключения к серверу';
    }
}

let lastUpdate = 0;
const UPDATE_INTERVAL = 10000;

function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    if (now - lastUpdate > UPDATE_INTERVAL) {
        updateAircrafts();
        lastUpdate = now;
    }

    updateAircraftsScale();
    controls.update();
    renderer.render(scene, camera);
}

addAirports();
updateAircrafts();
animate();

window.addEventListener('click', onClick, false);
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
