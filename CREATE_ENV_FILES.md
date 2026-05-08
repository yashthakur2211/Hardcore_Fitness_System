# Creating Environment Files

Follow these steps to create your `.env` files:

## Step 1: Create Backend .env File

1. Navigate to the `server` folder
2. Copy the example file:
   ```bash
   cd server
   cp .env.example .env
   ```
   Or on Windows (PowerShell):
   ```powershell
   cd server
   Copy-Item .env.example .env
   ```
   Or on Windows (CMD):
   ```cmd
   cd server
   copy .env.example .env
   ```

3. Open `server/.env` in a text editor and fill in your credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root                    # Your MySQL username
DB_PASSWORD=your_password       # Your MySQL password
DB_NAME=gymmaster_db

# JWT Secret (Change this to a random strong secret!)
JWT_SECRET=your-secret-key-change-in-production

# Server Configuration
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

**Important:**
- Replace `your_password` with your actual MySQL password
- Change `JWT_SECRET` to a random strong string (for production)
- If your MySQL user is not `root`, update `DB_USER`
- If your MySQL is on a different host, update `DB_HOST`

## Step 2: Create Frontend .env File

1. In the project root folder, create a `.env` file
2. Copy the example file:
   ```bash
   # From project root
   cp .env.example .env
   ```
   Or on Windows (PowerShell):
   ```powershell
   Copy-Item .env.example .env
   ```
   Or on Windows (CMD):
   ```cmd
   copy .env.example .env
   ```

3. Open `.env` in a text editor (it should already have the correct default value):

```env
# Frontend Environment Variables
VITE_API_URL=http://localhost:5000/api
```

**Note:** Usually no changes needed here unless your backend runs on a different port.

## Quick Setup Script

### For Windows (PowerShell):
```powershell
# Create backend .env
Copy-Item server\.env.example server\.env
Write-Host "Created server/.env - Please edit it with your database credentials"

# Create frontend .env
Copy-Item .env.example .env
Write-Host "Created .env - Ready to use"
```

### For Mac/Linux:
```bash
# Create backend .env
cp server/.env.example server/.env
echo "Created server/.env - Please edit it with your database credentials"

# Create frontend .env
cp .env.example .env
echo "Created .env - Ready to use"
```

## After Creating Files

1. **Edit `server/.env`** with your MySQL credentials:
   - `DB_PASSWORD` - Your MySQL root password (or other user password)
   - `DB_USER` - Usually `root` but can be different
   - `JWT_SECRET` - A random string for security

2. **Edit `.env`** (root) - Usually no changes needed, but verify:
   - `VITE_API_URL` - Should match your backend port (default: `http://localhost:5000/api`)

## Example Values

### If MySQL has no password:
```env
DB_PASSWORD=
```

### If MySQL password is "mypassword123":
```env
DB_PASSWORD=mypassword123
```

### If using a different MySQL user:
```env
DB_USER=gymuser
DB_PASSWORD=gymuser_password
```

## Verify Setup

After creating the files:

1. **Backend:**
   ```bash
   cd server
   npm run init-db
   ```

2. **Start servers:**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

## Security Notes

⚠️ **Important:**
- `.env` files are in `.gitignore` and will NOT be committed to git
- Never share your `.env` files
- Change default `JWT_SECRET` in production
- Use strong passwords in production

## Troubleshooting

**"Cannot find .env file":**
- Make sure you're in the correct directory
- Check if the file was created (it may be hidden on some systems)

**"Database connection error":**
- Verify MySQL is running
- Check `DB_PASSWORD` is correct
- Ensure `DB_USER` has proper permissions
- Try connecting to MySQL manually to verify credentials
