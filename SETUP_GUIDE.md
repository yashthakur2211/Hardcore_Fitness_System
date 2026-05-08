# Gym Master Hub - Complete Setup Guide

This guide will help you set up the Gym Master Hub application with a SQL database backend and authentication.

## Prerequisites

- Node.js (v18 or higher)
- MySQL or MariaDB database server
- npm or yarn package manager

## Step 1: Database Setup

### Install MySQL/MariaDB

**Windows:**
- Download and install MySQL from [mysql.com](https://dev.mysql.com/downloads/mysql/) or use XAMPP/WAMP
- Start MySQL service

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
```

### Create Database User (Optional)

```sql
CREATE USER 'gymuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON gymmaster_db.* TO 'gymuser'@'localhost';
FLUSH PRIVILEGES;
```

## Step 2: Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=gymmaster_db
   JWT_SECRET=your-super-secret-key-change-this-in-production
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

4. **Initialize the database:**
   ```bash
   npm run init-db
   ```
   
   This will:
   - Create the database and all tables
   - Insert default gym information
   - Create default fee structure
   - Create admin user (username: `admin`, password: `admin123`)

5. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   The server should start on `http://localhost:5000`

## Step 3: Frontend Setup

1. **Navigate to project root:**
   ```bash
   cd ..
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend should start on `http://localhost:5173`

## Step 4: Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. You'll be redirected to the login page
3. Use the default credentials:
   - **Username:** `admin`
   - **Password:** `admin123`

⚠️ **IMPORTANT:** Change the default admin password after first login!

## Step 5: Verify Everything Works

### Test Backend Connection

Visit: `http://localhost:5000/api/health`

You should see:
```json
{"status":"ok","message":"Gym Master API is running"}
```

### Test Database Connection

Visit: `http://localhost:5000/api/test-db`

You should see:
```json
{"status":"connected","data":[{"test":1}]}
```

### Test Frontend Connection

1. Login with admin credentials
2. Navigate to different pages (Members, Trainers, Payments, etc.)
3. Try creating a new member
4. Verify data persists after page refresh

## Features Now Available

✅ **Authentication**
- Secure login/logout
- JWT token-based authentication
- Protected routes

✅ **Member Management**
- Create, read, update, delete members
- Search and filter members
- View member details and membership history

✅ **Membership Management**
- Create memberships with different durations
- Track membership status (active/expired)
- Automatic status updates based on end dates

✅ **Payment Management**
- Record payments
- Track paid/pending amounts
- Generate receipts
- Multiple payment modes (Cash, UPI, Cheque)

✅ **Attendance Tracking**
- Mark member attendance
- View attendance history
- Daily attendance reports

✅ **Trainer Management**
- Add/update trainers
- Track trainer assignments
- Monitor trainer attendance

✅ **Enquiry Management**
- Record new enquiries
- Track referral sources
- Manage visit dates

✅ **Dashboard**
- Real-time statistics
- Quick overview widgets
- Gym information display

## Troubleshooting

### Database Connection Issues

**Error: "ER_ACCESS_DENIED_ERROR"**
- Check your MySQL username and password in `.env`
- Verify MySQL service is running
- Ensure user has proper permissions

**Error: "ECONNREFUSED"**
- Make sure MySQL server is running
- Check DB_HOST and PORT in `.env`
- Try `localhost` instead of `127.0.0.1`

### Backend Server Issues

**Error: "Port 5000 already in use"**
- Change PORT in `.env` file
- Or stop the process using port 5000

**Error: "Cannot find module"**
- Run `npm install` in the server directory
- Check node_modules folder exists

### Frontend Issues

**Error: "Failed to fetch"**
- Ensure backend server is running
- Check `VITE_API_URL` in `.env`
- Verify CORS settings in backend

**Login not working**
- Check browser console for errors
- Verify JWT_SECRET matches between frontend and backend
- Clear browser localStorage and try again

## Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Use environment-specific database credentials
4. Set up SSL/HTTPS
5. Configure proper CORS origins
6. Use a process manager like PM2

### Frontend

1. Build the application:
   ```bash
   npm run build
   ```
2. Serve the `dist` folder using a web server (nginx, Apache, etc.)
3. Update `VITE_API_URL` to point to your production API
4. Ensure HTTPS is configured

### Database

1. Create a production database
2. Run the schema SQL script on production database
3. Remove default admin user and create proper admin accounts
4. Set up regular backups
5. Configure proper database user permissions

## Default Admin Credentials

⚠️ **SECURITY WARNING**

Default credentials:
- Username: `admin`
- Password: `admin123`

**You MUST change this password immediately after setup!**

To change password:
1. Login to the application
2. Create a new admin user through the register endpoint (if implemented)
3. Or update directly in database:
   ```sql
   UPDATE users 
   SET password = '$2a$10$new_hashed_password' 
   WHERE username = 'admin';
   ```
   (Use bcrypt to hash your new password)

## Support

If you encounter any issues:
1. Check the console logs (both frontend and backend)
2. Verify all environment variables are set correctly
3. Ensure MySQL is running and accessible
4. Check that both servers are running on correct ports

## Next Steps

After successful setup:
1. Update gym information in the database
2. Customize fee structure
3. Add your trainers
4. Start registering members
5. Set up regular database backups
