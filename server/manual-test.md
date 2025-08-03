# Manual Testing Guide for User Management API

## Prerequisites
1. Start the server: `npm run dev`
2. Ensure MongoDB is running
3. Create test users through the auth endpoints first

## Test Endpoints

### 1. Get User Profile
```bash
GET /api/users/profile
Authorization: Bearer <your-jwt-token>
```

### 2. Update User Profile
```bash
PUT /api/users/profile
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "studentId": "NEW123" // for students
}
```

### 3. Get All Users (Admin only)
```bash
GET /api/users
Authorization: Bearer <admin-jwt-token>
```

### 4. Get User by ID (Admin only)
```bash
GET /api/users/:userId
Authorization: Bearer <admin-jwt-token>
```

### 5. Create User (Admin only)
```bash
POST /api/users
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@test.com",
  "password": "password123",
  "role": "Student",
  "studentId": "STU123"
}
```

### 6. Update User (Admin only)
```bash
PUT /api/users/:userId
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "name": "Updated User Name",
  "isActive": false
}
```

### 7. Delete User (Admin only)
```bash
DELETE /api/users/:userId
Authorization: Bearer <admin-jwt-token>
```

## Expected Responses

All successful responses follow this format:
```json
{
  "success": true,
  "data": { /* user data */ },
  "message": "Optional success message"
}
```

Error responses follow this format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": [] // Optional validation details
  }
}
```

## Authorization Testing

- Endpoints with `authenticate` middleware require valid JWT token
- Endpoints with `authorize('Admin')` require Admin role
- Profile endpoints are accessible by any authenticated user
- User management endpoints are Admin-only