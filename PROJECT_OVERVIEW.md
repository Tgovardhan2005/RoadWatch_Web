# RoadWatch v2 - Project Overview

RoadWatch v2 is a comprehensive web-based platform designed for managing, reporting, and tracking road damages (specifically in the context of Tamil Nadu, as indicated by the backend package description). It enables citizens to report road issues and allows administrators at different levels (District and Super Admin) to manage, verify, and resolve these issues efficiently.

## 🎯 Key Objectives
- Provide a platform for **Citizens** to report road damage with images and location data.
- Equip **District Administrators** with tools to review, validate, and manage reports within their jurisdiction.
- Give **Super Administrators** a global view to monitor all districts, manage users, and analyze overall system metrics.
- Utilize **Machine Learning** to automatically validate uploaded images and detect road damage.

---

## 🏗 Architecture & Tech Stack

The project follows a modern MERN-stack architecture (MongoDB, Express, React, Node.js) supplemented with real-time features and Machine Learning capabilities.

### 1. Frontend (Client-side)
Located in the `frontend` directory, the web application is built with:
- **Framework:** React 18 with Vite for fast building and HMR.
- **Routing:** React Router (`react-router-dom`) for navigation across Citizen, District Admin, and Super Admin views.
- **Mapping & Geospatial:** Leaflet & React-Leaflet (`leaflet`, `react-leaflet`) for displaying reports on a map and handling location coordinates.
- **Data Visualization:** Recharts (`recharts`) for analytical dashboards.
- **Machine Learning (In-Browser):** TensorFlow.js (`@tensorflow/tfjs`) for client-side image validation. It uses pre-trained Keras models (`damage_classifier.keras`, `road_damage_filter_model.keras`) to immediately check if an uploaded image contains road damage, providing instant feedback and reducing backend load.
- **Image Optimization:** `browser-image-compression` to resize and compress images before uploading them.
- **Real-time Updates:** Socket.IO Client (`socket.io-client`) to receive live notifications about report status changes.

### 2. Backend (Server-side)
Located in the `backend` directory, the server is built with:
- **Environment:** Node.js with Express (`express`).
- **Database:** MongoDB (via `mongoose`) for storing users, reports, and district data.
- **Authentication:** JWT (`jsonwebtoken`) and bcrypt (`bcryptjs`) for secure, role-based access control.
- **Geospatial Processing:** Turf.js (`@turf/boolean-point-in-polygon`, `@turf/helpers`) to determine which district a reported coordinate belongs to.
- **File Uploads & Image Processing:** Multer (`multer`) for handling multipart form data and Sharp (`sharp`) for image resizing and optimization on the server.
- **Real-time Communication:** Socket.IO (`socket.io`) is integrated directly into the Express server, handling rooms for specific users (`user_${id}`), districts (`district_${id}`), and super admins to push live status updates and notifications.

### 3. Machine Learning Ecosystem
Apart from the web stack, the project includes an ML pipeline:
- `create_damage_model.py`: A Python script likely used to train, retrain, or convert the underlying damage classification models using TensorFlow/Keras.
- `model_server.py`: A Python-based server that can serve the model independently, or act as an external API for heavy image processing that the Node.js backend might offload to.
- The React frontend directly loads `.keras` model files to perform local inference via `roadDamageModel.js`.

---

## 👥 User Roles & Workflows

### Citizens
- **Capabilities:** Can register, log in, and submit road damage reports.
- **Workflow:** A citizen takes a photo of a pothole or road damage. The browser compresses the image and runs a local TF.js model to ensure the image actually depicts a road/damage. If valid, the report is submitted along with GPS coordinates. Citizens can view the status of their own reports.

### District Administrators
- **Capabilities:** Responsible for a specific district (e.g., Chennai, Coimbatore).
- **Workflow:** District admins have a dashboard where they see incoming reports mapped to their district boundaries (calculated using Turf.js). They can review images, update the status of reports (e.g., Pending -> In Progress -> Resolved), and coordinate repairs. Socket.IO ensures they see new reports instantly.

### Super Administrators
- **Capabilities:** Full system overview.
- **Workflow:** Super admins can view aggregated statistics across all districts, manage district admin accounts, monitor system health, and oversee the entire resolution pipeline. They have access to comprehensive charts and maps.

---

## 📂 Project Structure Highlights

```text
RW v2/
├── backend/                  # Express Node.js Server
│   ├── middleware/           # Auth and validation middleware
│   ├── models/               # Mongoose schemas (User, Report, District)
│   ├── routes/               # API endpoints (auth, reports, admin, ai)
│   ├── utils/                # Helpers (e.g., seedDistricts)
│   └── server.js             # Main server entrypoint
│
├── frontend/                 # React Web App
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # UI Components grouped by role
│   │   │   ├── Citizen/      # Citizen UI
│   │   │   ├── DistrictAdmin/# Admin UI
│   │   │   └── SuperAdmin/   # Super Admin UI
│   │   ├── utils/            # Frontend helpers (TF.js model loader)
│   │   ├── main.jsx          # React initialization
│   │   └── RootApp.jsx       # Main application routing & layout
│   ├── *.keras               # Pre-trained ML models for browser inference
│   └── vite.config.js        # Build configuration
│
├── create_damage_model.py    # ML Model training/conversion script
└── model_server.py           # Python model serving (optional/microservice)
```

## 🚀 Key Algorithms & Technical Workflows

### 1. District Assignment via Geospatial Point-in-Polygon
**How reports go to the correct district:**
When a citizen submits a report, it includes their GPS coordinates (latitude and longitude). The backend uses **Turf.js** (specifically `@turf/boolean-point-in-polygon`) to run a **Point-in-Polygon** algorithm.
- The system stores a predefined bounding box (a geographic polygon) for every district in Tamil Nadu in the database.
- It iterates through these district polygons and checks if the reported coordinate falls inside the boundary.
- Once a match is found, the report is automatically tagged with that `districtId`, and real-time Socket.IO events are emitted only to that specific District Admin's room.

### 2. Duplicate Detection via Haversine Distance
**Algorithm:** Haversine Formula
To prevent the system from being spammed with multiple reports of the exact same pothole, the backend implements a proximity-based duplicate detection system.
- It queries the database for unresolved reports roughly in the same bounding box (±0.001 degrees latitude/longitude).
- It calculates the exact **great-circle distance** between the new report and existing reports using the **Haversine formula**.
- If an existing report is found within a **100-meter radius**, the new report is automatically **merged** into the existing one. The new report is counted as a "confirmation", incrementing the `confirmationCount` of the parent report and potentially escalating its severity.

### 3. Edge & Server-Side Machine Learning (CNNs)
**Algorithm:** Convolutional Neural Networks (CNNs)
The project utilizes Deep Learning image classification models built with Keras/TensorFlow. The analysis happens in two stages (managed via a Python server API):
- **Stage 1 (Binary Classification):** A "Road/Not-Road" filter (`road_damage_filter_model.keras`). This ensures users aren't uploading selfies or irrelevant images.
- **Stage 2 (Multi-Class Classification):** A Damage Classifier (`damage_classifier.keras`). If the image is a road, this model identifies the specific type of damage and assigns a confidence score. This helps District Admins prioritize severe damages automatically.

## 🚀 Key Features to Note
1. **Edge AI Validation:** By moving image classification to the browser or a dedicated Python inference server, the system prevents users from uploading irrelevant photos before consuming core server bandwidth.
2. **Geospatial Awareness:** Uses coordinates and polygon data to automatically route a user's report to the correct local district administrator.
3. **Real-Time Synchronisation:** When a district admin updates a report's status, the citizen is notified immediately via WebSockets, ensuring transparency.
