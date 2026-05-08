# Gym Master Hub - Backend API Server

This is the backend API server for the Gym Master Hub application.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Database

1. Make sure you have MySQL/MariaDB installed and running
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=gymmaster_db
   JWT_SECRET=your-secret-key-change-in-production
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

### 3. Initialize Database

Run the initialization script to create the database and tables:

```bash
npm run init-db
```

This will:
- Create the database
- Create all necessary tables
- Insert default gym info and fee structure
- Create a default admin user (username: `admin`, password: `admin123`)

⚠️ **Important**: Change the default admin password after first login!

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000` (or the PORT specified in `.env`)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member by ID
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member
- `GET /api/members/generate/id` - Generate new member ID

### Memberships
- `GET /api/memberships` - Get all memberships
- `GET /api/memberships/member/:memberId` - Get memberships by member
- `POST /api/memberships` - Create membership
- `PUT /api/memberships/:id` - Update membership
- `GET /api/memberships/generate/id` - Generate new membership ID

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/member/:memberId` - Get payments by member
- `POST /api/payments` - Create payment
- `GET /api/payments/generate/id` - Generate payment ID
- `GET /api/payments/generate/receipt-id` - Generate receipt ID

### Attendance
- `GET /api/attendance` - Get all attendance (optional ?date query)
- `GET /api/attendance/member/:memberId` - Get attendance by member
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/generate/id` - Generate attendance ID

### Trainers
- `GET /api/trainers` - Get all trainers
- `GET /api/trainers/:id` - Get trainer by ID
- `POST /api/trainers` - Create trainer
- `PUT /api/trainers/:id` - Update trainer
- `DELETE /api/trainers/:id` - Delete trainer
- `GET /api/trainers/generate/id` - Generate trainer ID

### Trainer Attendance
- `GET /api/trainer-attendance` - Get all trainer attendance
- `POST /api/trainer-attendance` - Mark trainer attendance
- `GET /api/trainer-attendance/generate/id` - Generate ID

### Enquiries
- `GET /api/enquiries` - Get all enquiries
- `POST /api/enquiries` - Create enquiry
- `PUT /api/enquiries/:id` - Update enquiry
- `DELETE /api/enquiries/:id` - Delete enquiry
- `GET /api/enquiries/generate/id` - Generate enquiry ID

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/gym-info` - Get gym information
- `GET /api/dashboard/fee-structure` - Get fee structure

## Authentication

All API endpoints (except `/api/auth/login` and `/api/auth/register`) require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

See `database/schema.sql` for the complete database schema.

## Default Credentials

After running `npm run init-db`, you can login with:
- Username: `admin`
- Password: `admin123`

⚠️ **Remember to change the default password in production!**
