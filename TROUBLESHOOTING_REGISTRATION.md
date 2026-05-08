# Member Registration Error - Troubleshooting Guide

## Common Causes of 500 Error

### 1. **Foreign Key Constraint Error**
If you selected a personal trainer but the trainer doesn't exist in the database:
- **Solution**: Make sure trainers are added first, or don't select a trainer

### 2. **Database Connection Issue**
- **Check**: Verify backend server is running
- **Check**: Verify database is accessible

### 3. **Missing Required Fields**
- All fields marked with * are required:
  - Name
  - Phone
  - Date of Birth
  - Membership Duration

## Steps to Debug

### Step 1: Check Backend Console
Look at the terminal where your backend server is running. You should see detailed error messages like:
```
Create member error: [Error details]
Error details: {
  code: 'ER_NO_REFERENCED_ROW_2',
  sqlMessage: '...',
  message: '...'
}
```

### Step 2: Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab → find the `/api/members` request → see the response

### Step 3: Verify Database
Make sure:
- Database is initialized (`npm run init-db`)
- All tables exist
- Trainers exist (if selecting a trainer)

### Step 4: Test API Directly
```bash
# Test member creation (replace with actual values)
curl -X POST http://localhost:5000/api/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memberId": "MEM001",
    "name": "Test User",
    "phone": "1234567890",
    "dob": "1990-01-01",
    "address": "Test Address",
    "hasPersonalTrainer": false
  }'
```

## Recent Fixes Applied

1. ✅ **Better Error Messages** - Backend now shows detailed errors in development
2. ✅ **Trainer Validation** - Checks if trainer exists before creating member
3. ✅ **Empty String Handling** - Properly handles empty trainer IDs

## After Fixes

**You must restart your backend server** for the changes to take effect:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd server
npm run dev
```

## Still Having Issues?

Share:
1. The exact error message from backend console
2. The browser console error
3. The Network tab response for the failed request
