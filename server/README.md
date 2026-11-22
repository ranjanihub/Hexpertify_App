# Hexpertify API (server)

The Express REST API. In production the website (apps/web) serves it in-process at /api/*; see the root README.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The API starts on **`http://localhost:5000`** on its own (optional: `npm run dev` at the repo root already serves it on :3000).

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
