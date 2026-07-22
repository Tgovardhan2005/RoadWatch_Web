# RoadWatch v2 🛣️

**RoadWatch v2** is an AI-powered geospatial road damage management platform for Tamil Nadu. It enables citizens to report road issues with automated image verification and provides district and super-admin authorities with real-time dashboards to manage and resolve road infrastructure problems.

---

## 🎯 Key Features

- **📸 Citizen Reporting & AI Verification:** Citizens upload road damage photos auto-verified by YOLOv8 deep learning.
- **🤖 YOLOv8 AI Detection:** Detects damage types (potholes, cracks, surface damage, waterlogging, construction damage) and severity.
- **📍 Geospatial District Routing:** Uses Turf.js point-in-polygon matching to route reports to the correct district administration.
- **🔗 Automatic Duplicate Merging:** Merges nearby reports within 100 meters using Haversine distance calculations.
- **🏢 District & Super-Admin Dashboards:** Real-time dashboards with analytics, severity distribution, and status tracking.
- **⚡ Real-Time Socket.IO Updates:** Live push notifications when report statuses change.
- **🛡️ Backend Geocoding Proxy & Security:** Centralized JWT authentication and server-side reverse geocoding via OpenStreetMap.

---

## 🏗 Architecture & Tech Stack

- **Frontend:** React 18, Vite, React Router, Leaflet Maps, Recharts, Socket.IO Client
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Turf.js, Socket.IO Server
- **AI Microservice:** Python Flask, Ultralytics YOLOv8 (`roadwatch_yolov8_final_87_percent.pt`)

### Microservices & Ports

| Service | Stack | Port |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | `3000` |
| **Backend API** | Node.js + Express + MongoDB | `5002` |
| **AI Microservice** | Python Flask + YOLOv8 | `5000` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+) with `flask`, `flask-cors`, `ultralytics`, `pillow`, `torch`
- MongoDB (Local or Atlas)

### Setup & Run

#### 1. Backend (Port 5002)
```bash
cd backend
npm install
npm start
```

#### 2. AI Microservice (Port 5000)
```bash
cd Yolov8
pip install flask flask-cors ultralytics pillow torch
python app.py
```

#### 3. Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📂 Project Structure

```text
RW v2/
├── backend/                  # Express API Server (Port 5002)
│   ├── config/               # Centralized JWT config (jwt.js)
│   ├── middleware/           # Auth middlewares
│   ├── models/               # MongoDB models (Report, User, District, Notification)
│   ├── routes/               # Express endpoints (auth, reports, districts, admin, ai)
│   └── server.js             # Server entry point
├── frontend/                 # React Web App (Port 3000)
│   ├── src/                  # React components, routing, and utilities
│   └── vite.config.js        # Vite dev server & proxy routes
├── Yolov8/                   # Flask YOLOv8 AI Service (Port 5000)
│   ├── app.py                # Flask app (/analyze-road, /health)
│   └── roadwatch_yolov8_final_87_percent.pt # YOLOv8 model weights
└── README.md                 # Project overview and guide
```
