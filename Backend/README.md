# ⚡ Hexpertify Central Backend & Identity Gateway

Unified, standalone backend service connecting all panels in the Hexpertify ecosystem to a shared MongoDB Atlas database with cryptographic Single Sign-On (SSO).

---

## 🎯 Connected Ecosystem Panels

* **🛡️ Super Admin Suite**: `http://localhost:5175`
* **🩺 Consultant Suite**: `http://localhost:5000`
* **👤 Client Portal**: `http://localhost:5173`
* **🌐 Live Web Portal**: `http://localhost:3000`

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The server will start on **`http://localhost:5001`** (or `http://localhost:3000`).

---

## 📚 API Endpoints Summary

### Authentication & Single Sign-On (SSO)
* `POST /api/auth/login` - Authenticate admin, therapist, or client credentials against MongoDB Atlas.
* `POST /api/auth/sso-ticket` - Generate a cryptographically signed HMAC-SHA256 single-use ticket (valid 60s).
* `POST /api/auth/sso-verify` - Verify and redeem an SSO ticket (with replay attack prevention).
* `GET /api/auth/me` - Session profile check.

### Consultants & Practitioners
* `GET /api/consultants` (and `/api/admin/consultants`) - Fetch all consultants from MongoDB.
* `GET /api/consultants/:id` - Fetch single consultant.
* `POST /api/consultants` - Add new practitioner.
* `PUT /api/consultants/:id` - Update practitioner details or status.
* `DELETE /api/consultants/:id` - Remove practitioner.

### Clients & Users
* `GET /api/users` (and `/api/admin/users`) - List clients/users.
* `POST /api/users` - Register/create user.
* `PUT /api/users/:id` - Update user account.
* `DELETE /api/users/:id` - Remove user.

### Bookings & Sessions
* `GET /api/bookings` - List all appointments and consultations.
* `POST /api/bookings` - Schedule consultation.
* `PUT /api/bookings/:id` - Update appointment status or Google Meet link.
* `DELETE /api/bookings/:id` - Cancel booking.

### Health Check
* `GET /api/health` - Health status and uptime.
