# Technology Stack & Build System

## Architecture
Full-stack monorepo with separate client and server applications.

## Frontend Stack
- **React 19** with functional components and hooks
- **Vite** for fast development and building
- **React Router v7** for client-side routing
- **Axios** for API communication
- **Context API** for state management
- **ESLint** for code linting with React-specific rules

## Backend Stack
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests
- **dotenv** for environment configuration
- **Multer** for file uploads (when implemented)

## Development Tools
- **Nodemon** for auto-restarting backend server
- **ESLint** with React hooks and refresh plugins
- **Vite** for fast frontend builds and HMR

## Common Commands

### Development Setup
```bash
# Backend setup
cd server
npm install
npm run dev    # Starts on http://localhost:5000

# Frontend setup (separate terminal)
cd client
npm install
npm run dev    # Starts on http://localhost:5173
```

### Production Build
```bash
# Build frontend
cd client
npm run build  # Creates dist/ folder

# Start production server
cd server
npm start
```

### Code Quality
```bash
# Frontend linting
cd client
npm run lint

# Preview production build
cd client
npm run preview
```

## Environment Configuration

### Server (.env in server/)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/student-portal
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Client (optional .env in client/)
```env
VITE_API_URL=http://localhost:5000/api
```

## Key Technical Decisions
- **Module type**: Client uses ES modules, Server uses CommonJS
- **API base URL**: Configured in client/src/services/api.js
- **File uploads**: Stored in server/uploads/ directory
- **Authentication**: JWT tokens with role-based middleware
- **Database**: MongoDB with Mongoose for schema validation