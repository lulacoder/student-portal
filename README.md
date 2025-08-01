# Student Portal System

A comprehensive educational management platform that facilitates learning through role-based access and course management.

## Features

- **Role-based access control**: Students, Instructors, and Administrators with distinct permissions
- **Course management**: Create, manage, and enroll in courses
- **Assignment system**: Upload assignments, submit work, and provide grading/feedback
- **Announcement system**: Course-specific and system-wide communications
- **File upload support**: Handle assignment files and student submissions
- **Authentication**: JWT-based secure login and registration

## Tech Stack

### Frontend
- React 19 with functional components and hooks
- Vite for fast development and building
- React Router v7 for client-side routing
- Axios for API communication
- Context API for state management

### Backend
- Node.js with Express.js framework
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- Multer for file uploads

## Project Structure

```
student-portal/
├── client/          # React frontend application
├── server/          # Express backend application
├── .gitignore       # Git ignore rules
└── README.md        # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd student-portal
```

2. Install backend dependencies
```bash
cd server
npm install
```

3. Install frontend dependencies
```bash
cd ../client
npm install
```

4. Set up environment variables
```bash
cd ../server
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret
```

### Development

1. Start the backend server
```bash
cd server
npm run dev    # Starts on http://localhost:5000
```

2. Start the frontend development server (in a new terminal)
```bash
cd client
npm run dev    # Starts on http://localhost:5173
```

### Testing

Run backend tests:
```bash
cd server
npm test
```

Run frontend tests:
```bash
cd client
npm test
```

### Production Build

1. Build the frontend
```bash
cd client
npm run build
```

2. Start the production server
```bash
cd server
npm start
```

## API Documentation

The API is RESTful and all endpoints are prefixed with `/api/`:

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/courses/*` - Course operations
- `/api/assignments/*` - Assignment management
- `/api/announcements/*` - Announcement system

## User Roles

### Students
- View enrolled courses and assignments
- Submit assignments with file uploads
- View grades and instructor feedback
- Read course announcements

### Instructors
- Create and manage courses
- Create assignments with due dates
- Grade student submissions and provide feedback
- Post course announcements
- View enrolled students

### Administrators
- Manage all users and courses
- System-wide announcements
- User role management
- Full system oversight

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.