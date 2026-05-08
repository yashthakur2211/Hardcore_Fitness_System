# Login Troubleshooting Guide

## Quick Fix Steps

### Step 1: Make sure backend is running

Open a terminal and run:
```bash
cd server
npm run dev
```

You should see: `🚀 Server running on port 5000`

### Step 2: Fix admin password

The password hash might be incorrect. Run this command to fix it:

```bash
cd server
npm run fix-admin
```

This will create/update the admin user with the correct password hash.

### Step 3: Verify database is initialized

If you haven't initialized the database yet:

```bash
cd server
npm run init-db
```

Then run the fix-admin script again:
```bash
npm run fix-admin
```

### Step 4: Check your .env file

Make sure `server/.env` has correct database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=gymmaster_db
```

## Testing the Login

### Test the API directly

Open your browser or use curl:
```bash
# Test if backend is running
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to login
4. Check for any error messages

### Common Issues

#### Issue: "Invalid credentials"
**Solution:** Run `npm run fix-admin` in the server folder

#### Issue: "Cannot connect to API"
**Solution:** 
- Make sure backend is running (`npm run dev` in server folder)
- Check if port 5000 is available
- Verify `.env` file has `VITE_API_URL=http://localhost:5000/api`

#### Issue: "Database connection error"
**Solution:**
- Check MySQL is running
- Verify database credentials in `server/.env`
- Make sure database exists (run `npm run init-db`)

#### Issue: "CORS error"
**Solution:**
- Check `FRONTEND_URL` in `server/.env` matches your frontend URL
- Default should be `http://localhost:5173`

## Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

## Still having issues?

1. Check server logs for errors
2. Check browser console for errors
3. Verify both frontend and backend are running
4. Make sure database is accessible
5. Try clearing browser cache and localStorage
