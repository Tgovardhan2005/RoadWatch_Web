# RoadWatch 🛣️

RoadWatch is a comprehensive web-based platform designed for managing, reporting, and tracking road damages (specifically tailored for Tamil Nadu). It empowers citizens to report road issues and provides administrators at both the district and super-admin levels with the necessary tools to manage, verify, and resolve these issues efficiently.

## 🎯 Key Features

- **Citizen Reporting:** Citizens can easily report road damage by uploading images along with their GPS location data.
- **District Administration:** District Admins have dedicated dashboards to review, validate, and manage reports specific to their jurisdiction using geospatial routing.
- **Global Monitoring:** Super Administrators get a global view of all districts to monitor user activity, track system health, and analyze overall metrics.
- **Edge AI Image Validation:** Utilizes client-side Machine Learning (TensorFlow.js) to instantly validate uploaded images, ensuring they contain road damage before submission, reducing backend load and preventing spam.
- **Real-time Synchronization:** Built with Socket.IO for live updates on report statuses, ensuring instant communication between admins and citizens.
- **Automated Duplicate Detection:** Leverages Haversine distance calculations to automatically detect and group duplicate reports within a 100-meter radius.

---

## 🏗 Architecture & Tech Stack

The project follows a modern MERN-stack architecture, supplemented by real-time features and machine learning models.

### Frontend
- **Framework:** React 18 (Vite)
- **Routing:** React Router
- **Maps:** Leaflet & React-Leaflet
- **Data Visualization:** Recharts
- **Machine Learning:** TensorFlow.js (`@tensorflow/tfjs`) with pre-trained Keras models
- **Real-time:** Socket.IO Client

### Backend
- **Environment:** Node.js & Express
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT & bcrypt
- **Geospatial Processing:** Turf.js (Point-in-Polygon for district routing)
- **File Processing:** Multer & Sharp (Image optimization)
- **Real-time:** Socket.IO Server

### Machine Learning
- **Models:** CNN-based image classification for Road/Not-Road detection and Damage Classification.
- **Scripts:** `create_damage_model.py` (Training) and `model_server.py` (Inference API).

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "RW v2"
   ```

2. **Backend Setup:**
   Navigate to the backend directory, install dependencies, configure environment variables, and start the server.
   ```bash
   cd backend
   npm install
   
   # Create a .env file based on environment requirements (e.g., PORT, MONGO_URI, JWT_SECRET)
   # Start the backend development server
   npm run dev
   ```

3. **Frontend Setup:**
   Open a new terminal, navigate to the frontend directory, install dependencies, and start the Vite development server.
   ```bash
   cd frontend
   npm install
   
   # Start the frontend application
   npm run dev
   ```

The frontend application should now be accessible at `http://localhost:5173` (or the port specified by Vite), and the backend server will run on its configured port.

---

## 👥 User Roles

- **Citizens:** Register, log in, capture photos of road damage, and submit reports with auto-captured GPS coordinates. Track the status of submitted reports.
- **District Administrators:** Monitor a localized dashboard displaying reports within their specific district (e.g., Chennai, Coimbatore). Update statuses and coordinate repairs in real-time.
- **Super Administrators:** Access comprehensive analytics, oversee all districts, manage user accounts, and view global system metrics.

---

## 📂 Project Structure

```text
Roadwatch/
├── backend/                  # Express Node.js Server API
│   ├── middleware/           # Authentication & validation
│   ├── models/               # MongoDB Schemas
│   ├── routes/               # API endpoints
│   └── server.js             # Main entry point
├── frontend/                 # React Web Application
│   ├── public/               # Static assets & ML model files (*.keras)
│   ├── src/                  # React components, routing, and utilities
│   └── vite.config.js        # Vite configuration
```

For more in-depth technical details on the algorithms (Point-in-Polygon routing, Haversine duplicate detection, and CNN ML integration), please refer to the `PROJECT_OVERVIEW.md` file.
