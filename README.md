# Student Portal - Full-Stack Educational Management System

A comprehensive educational management platform built with React (frontend) and Node.js/Express (backend) with MongoDB. This system provides role-based access for students, instructors, and administrators with features including course management, assignment submission, grading, and announcements.

## 🚀 Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **React Router v6** for client-side routing
- **Axios** for API communication
- **Context API** for state management
- **Tailwind CSS** for styling (optional, can be added)

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **dotenv** for environment configuration

### Development Tools
- **Nodemon** for auto-restarting development server
- **ESLint** for code linting
- **Vite** for fast frontend builds

## 📁 Project Structure

```
student-portal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── server/                # Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── uploads/         # File uploads directory
│   └── server.js        # Entry point
└── README.md            # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd student-portal
```

### 2. Backend Setup

#### Navigate to server directory:
```bash
cd server
```

#### Install backend dependencies:
```bash
npm install
```

#### Create environment variables:
Create a `.env` file in the server directory with the following:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/student-portal
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

#### Start MongoDB:
- **Local MongoDB**: Make sure MongoDB service is running
- **MongoDB Atlas**: Update `MONGO_URI` with your Atlas connection string

#### Run the backend server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

### 3. Frontend Setup

#### Navigate to client directory:
```bash
cd ../client
```

#### Install frontend dependencies:
```bash
npm install
```

#### Configure API endpoint:
The API endpoint is configured to `http://localhost:5000` by default. If you need to change this, update the base URL in `client/src/services/api.js`

#### Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🔧 Available Scripts

### Backend Scripts
```bash
cd server
npm start      # Start production server
npm run dev    # Start development server with nodemon
```

### Frontend Scripts
```bash
cd client
npm run dev    # Start development server
npm run build  # Build for production
npm run preview # Preview production build
npm run lint   # Run ESLint
```

## 🔐 Environment Variables

### Server Environment Variables (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/student-portal` |
| `JWT_SECRET` | Secret key for JWT tokens | Required - set strong value |
| `NODE_ENV` | Environment mode | `development` |

### Client Environment Variables (Optional)
Create `.env` file in client directory if needed:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🎯 Features Overview

### Authentication & Authorization
- **JWT-based authentication**
- **Role-based access control** (Student, Instructor, Admin)
- **Protected routes** on frontend
- **Password hashing** with bcryptjs

### User Roles & Permissions

#### Students
- Register and login
- View enrolled courses
- Submit assignments
- View grades and feedback
- Read announcements

#### Instructors
- Create and manage courses
- Create assignments
- Grade student submissions
- Post course announcements
- View enrolled students

#### Admins
- Manage all users
- Manage all courses
- System-wide announcements
- User role management

### Core Features
- **Course Management**: CRUD operations for courses
- **Assignment System**: Upload, submit, and grade assignments
- **Enrollment System**: Students can enroll in courses
- **Announcement System**: Course and system-wide announcements
- **File Upload**: Support for assignment files and submissions
- **Real-time Updates**: Live grade updates and notifications

## 🗄️ Database Schema

### User Model
- Personal information (name, email, role)
- Authentication credentials
- Enrollment data

### Course Model
- Course details (title, description, instructor)
- Enrollment management
- Assignment associations

### Assignment Model
- Assignment details
- Due dates and instructions
- Submission tracking

### Submission Model
- Student submissions
- File references
- Grades and feedback

### Announcement Model
- Course-specific or system-wide
- Target audience by role

## 🚀 Building for Production

### 1. Build the Frontend
```bash
cd client
npm run build
```

This creates a `dist/` folder with optimized production build.

### 2. Configure Production Environment
Update the server `.env` file:
```env
NODE_ENV=production
```

### 3. Serve Static Files
The backend is configured to serve the React build files automatically.

### 4. Deploy to Production
- **Backend**: Deploy to services like Heroku, Railway, or DigitalOcean
- **Frontend**: Deploy to Vercel, Netlify, or serve from backend
- **Database**: Use MongoDB Atlas for cloud database

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test  # If tests are added
```

### Frontend Testing
```bash
cd client
npm test  # If tests are added
```

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Failed
- Ensure MongoDB service is running locally
- Check MongoDB URI in `.env` file
- For MongoDB Atlas, ensure IP whitelist includes your IP

#### Port Already in Use
- Change `PORT` in `.env` file
- Kill process using the port: `npx kill-port 5000`

#### CORS Issues
- Backend has CORS configured for `http://localhost:5173`
- Update CORS settings in `server.js` if using different frontend URL

#### File Upload Issues
- Ensure `server/uploads/` directory exists
- Check file size limits in upload middleware

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id/role` - Update user role (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (Instructor/Admin)
- `PUT /api/courses/:id` - Update course (Instructor/Admin)
- `DELETE /api/courses/:id` - Delete course (Instructor/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course (Students)

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get single assignment
- `POST /api/assignments` - Create assignment (Instructors)
- `PUT /api/assignments/:id` - Update assignment (Instructors)
- `DELETE /api/assignments/:id` - Delete assignment (Instructors)
- `POST /api/assignments/:id/submit` - Submit assignment (Students)

### Submissions
- `GET /api/submissions` - Get all submissions
- `GET /api/submissions/:id` - Get single submission
- `PUT /api/submissions/:id/grade` - Grade submission (Instructors)

### Announcements
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement (Instructors/Admin)
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

## 🔄 Development Workflow

### 1. Start Development Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 2. Make Changes
- Frontend changes will auto-reload
- Backend changes will restart automatically with nodemon

### 3. Test Features
- Test all user roles (Student, Instructor, Admin)
- Verify file uploads work correctly
- Check authentication flow

### 4. Build for Production
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

## 📋 Next Steps & Enhancements

### Immediate Next Steps
1. **Add Tailwind CSS** for better styling
2. **Implement real-time notifications** with Socket.io
3. **Add email notifications** for new assignments/grades
4. **Implement search functionality** for courses and users
5. **Add pagination** for large datasets

### Future Enhancements
- **Discussion forums** for courses
- **Calendar integration** for assignment due dates
- **Video conferencing** integration
- **Mobile app** with React Native
- **Advanced analytics** for instructors
- **Gradebook export** functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@studentportal.com or create an issue in the GitHub repository.

---

**Built with ❤️ for educational excellence**