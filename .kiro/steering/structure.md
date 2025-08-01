# Project Structure & Organization

## Root Structure
```
student-portal/
├── client/          # React frontend application
├── server/          # Express backend application
└── README.md        # Project documentation
```

## Frontend Structure (client/)
```
client/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page-level components
│   ├── context/     # React context providers
│   ├── hooks/       # Custom React hooks
│   ├── services/    # API service functions (axios)
│   ├── utils/       # Utility functions
│   ├── assets/      # Static assets (images, etc.)
│   ├── App.jsx      # Main app component
│   ├── main.jsx     # React entry point
│   └── index.css    # Global styles
├── public/          # Static public assets
├── dist/            # Production build output
├── package.json     # Frontend dependencies
├── vite.config.js   # Vite configuration
└── eslint.config.js # ESLint configuration
```

## Backend Structure (server/)
```
server/
├── config/          # Database configuration
│   └── db.js        # MongoDB connection
├── controllers/     # Route controllers (business logic)
│   ├── authControllers.js
│   ├── userController.js
│   ├── courseController.js
│   ├── assignmentController.js
│   └── announcementController.js
├── middleware/      # Custom middleware
│   ├── authMiddleware.js    # JWT authentication
│   └── errorHandler.js      # Error handling
├── models/          # Mongoose data models
│   ├── User.js
│   ├── Course.js
│   ├── Assignment.js
│   ├── Submission.js
│   └── Announcement.js
├── routes/          # API route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── courseRoutes.js
│   ├── assignmentRoutes.js
│   └── announcementRoutes.js
├── utils/           # Utility functions
│   └── generateToken.js     # JWT token generation
├── uploads/         # File upload storage
├── .env             # Environment variables
├── package.json     # Backend dependencies
└── server.js        # Express server entry point
```

## Naming Conventions
- **Files**: camelCase for JavaScript files, PascalCase for React components
- **Directories**: lowercase with hyphens or camelCase
- **Routes**: RESTful naming (e.g., `/api/courses/:id`)
- **Models**: PascalCase (e.g., User, Course)
- **Controllers**: camelCase with "Controller" suffix

## API Structure
All API routes are prefixed with `/api/`:
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/courses/*` - Course operations
- `/api/assignments/*` - Assignment management
- `/api/announcements/*` - Announcement system

## File Organization Rules
- **Controllers**: One controller per resource, handle HTTP requests/responses
- **Models**: One model per database collection, define schema and validation
- **Routes**: One route file per resource, define endpoints and middleware
- **Middleware**: Reusable functions for authentication, error handling, etc.
- **Services**: Frontend API calls organized by resource type
- **Components**: Reusable UI components, one component per file
- **Pages**: Top-level route components representing full pages