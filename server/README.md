# Bio Cashflow Backend Server

This is the backend server for the Bio Cashflow application, providing user authentication and data storage using MongoDB.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- MongoDB (version 4.4 or higher)

## Installation

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

## MongoDB Setup

### Option 1: Install MongoDB locally

1. Download and install MongoDB Community Server:
   - Visit [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Download the appropriate version for your operating system
   - Follow the installation instructions

2. Start MongoDB service:
   - On Windows: `net start MongoDB`
   - On macOS/Linux: `sudo systemctl start mongod`

### Option 2: Use Docker (Recommended for development)

1. Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

2. Run MongoDB in a Docker container:
   ```
   docker run --name mongodb -p 27017:27017 -d mongo
   ```

## Configuration

1. Create a `.env` file in the server directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bio-cashflow
   JWT_SECRET=your-super-secret-jwt-key
   ```

2. Adjust the values as needed for your environment.

## Running the Server

### Development Mode

```
npm run dev
```

This will start the server with nodemon, which automatically restarts when code changes are detected.

### Production Mode

```
npm start
```

This will start the server in production mode.

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login with existing credentials
- `GET /api/users` - Get all users (for debugging)
- `GET /api/health` - Health check endpoint

## Troubleshooting

### MongoDB Connection Issues

1. Ensure MongoDB is running:
   - Check if the MongoDB service is active
   - Verify the connection string in `.env`

2. Check firewall settings:
   - Ensure port 27017 is not blocked

### Common Errors

- "EADDRINUSE" - Another process is using the port. Change the PORT in `.env` or kill the process using the port.
- "ECONNREFUSED" - MongoDB is not running. Start the MongoDB service.

## Security Notes

- In a production environment, ensure the JWT_SECRET is a strong, randomly generated secret
- Never commit the `.env` file to version control
- Use proper password hashing (bcrypt) in production