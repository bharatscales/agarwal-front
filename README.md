# Production ERP

A production ERP web application for managing operations including transport, vehicles, bilty, and party management.

## Features

### 🔐 Authentication
- Secure login system with JWT tokens
- User session management
- Protected routes

### 📊 Dashboard Overview
- Real-time statistics and metrics
- Recent activity tracking
- Quick access to all modules

### 🚛 Transport Management
- Add new transport companies
- View all transports in a table format
- Edit and delete transport records
- GSTIN tracking

### 🚗 Vehicle Management (Coming Soon)
- Vehicle registration and tracking
- Vehicle number management
- Vehicle-transport associations

### 📋 Bilty Management (Coming Soon)
- Create and manage bilty documents
- Link transports and vehicles
- Date and station tracking

### 👥 Party Management (Coming Soon)
- Customer and supplier management
- Address and SAP code tracking
- Party-transaction history

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **React Router DOM** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **Vite** for build tooling

### Backend
- **FastAPI** with Python
- **SQLModel** for database ORM
- **JWT** for authentication
- **SQLite** database

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Frontend Setup
```bash
cd frontend/agarwal
npm install
npm install react-router-dom @types/react-router-dom
npm run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Access the Application
- Frontend: http://localhost:5173
- Login: http://localhost:5173/login
- Dashboard: http://localhost:5173/dashboard
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Usage

1. **Login**: Use your credentials to access the ERP
   - If already logged in, you'll be automatically redirected to dashboard
2. **Dashboard**: View overview statistics and recent activities
3. **Transport Management**: Add and manage transport companies
4. **Navigation**: Use the tab navigation to switch between modules

## API Endpoints

### Authentication
- `POST /login/` - User login
- `GET /user/me` - Get current user info

### Transport Management
- `GET /transport/` - Get all transports
- `POST /transport/` - Create new transport
- `PUT /transport/` - Update transport

## Development

### Project Structure
```
frontend/agarwal/
├── src/
│   ├── components/
│   │   └── Navigation.tsx # Reusable navigation component
│   ├── pages/
│   │   ├── Login.tsx      # Login component
│   │   └── dashboard.tsx  # Main dashboard
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # Entry point
└── package.json

backend/
├── routers/              # API route handlers
├── model.py             # Database models
├── main.py              # FastAPI app
└── requirements.txt     # Python dependencies
```

### Adding New Features
1. Create new components in `src/pages/`
2. Add API endpoints in backend routers
3. Update the dashboard navigation
4. Test the integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for Agaarwal Flexible Packaging.
