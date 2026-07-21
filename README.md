# ProComm - Professional Video Conference Application

A modern, feature-rich video conferencing application built with React, Node.js, Socket.IO, and WebRTC.

## 🌟 Features

- **HD Video & Audio Calls** with WebRTC technology
- **Real-time Chat** with message history  
- **Screen Sharing** for presentations
- **Reactions & Emojis** for interactive meetings
- **Participant Management** with user controls
- **More Tools** including Notepad and Whiteboard
- **Mobile Responsive** design for all devices
- **Professional UI** with modern design

## 🚀 Live Demo

Visit: [https://procomm-india.vercel.app](https://procomm-india.vercel.app/)

## 🛠️ Tech Stack

- **Frontend**: React 18, TailwindCSS, Lucide React Icons
- **Backend**: Node.js, Express, Socket.IO  
- **WebRTC**: PeerJS for peer-to-peer connections
- **Styling**: TailwindCSS with responsive design
- **Deployment**: Vercel for production hosting

## 🚀 Features

- **Modern React Frontend** with responsive design
- **Dark/Light Theme Toggle** with localStorage persistence  
- **Interactive Chatbot Widget** with voice input and text messaging
- **Real-time Video Conferencing** using WebRTC and Socket.IO
- **Meeting Management** - Create, join, and manage video meetings
- **Participant Management** - Email-based meeting invitations and validation
- **Screen Sharing** capabilities
- **Chat Messaging** during meetings
- **Professional UI/UX** with smooth animations and transitions

## 🛠️ Tech Stack

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **Socket.IO Client** for real-time communication
- **PeerJS** for WebRTC connections

### Backend  
- **Node.js** with Express server
- **Socket.IO** for real-time messaging
- **UUID** for meeting ID generation
- **CORS** for cross-origin requests
- **Helmet** for security
- **Compression** for performance

## 📁 Project Structure

```
procomm-app/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Navbar.js
│   │   │   ├── Chatbot.js
│   │   │   ├── JoinMeetingModal.js
│   │   │   └── CreateMeetingModal.js
│   │   ├── pages/          # Page components
│   │   │   ├── Login.js
│   │   │   ├── Home.js
│   │   │   ├── Profile.js
│   │   │   ├── Support.js
│   │   │   └── VideoRoom.js
│   │   ├── context/        # React contexts
│   │   │   └── ThemeContext.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   └── meetings.js     # Meeting management routes
│   ├── server.js           # Main server file
│   └── package.json
└── package.json            # Root package.json with scripts
```

## 🎯 Key Features Implemented

### 1. **Theme System**
- Toggle between Light and Dark modes
- Persistent theme settings using localStorage
- Smooth transitions between themes

### 2. **Chatbot Widget**
- Minimizable/maximizable widget
- Voice input using Web Speech API
- Text messaging capabilities
- Positioned at bottom-right corner

### 3. **Meeting Management**
- Create meetings with participant invitations
- Join meetings with email validation
- Real-time participant management
- Meeting access control

### 4. **Video Conferencing**
- WebRTC peer-to-peer connections
- Camera and microphone controls
- Screen sharing functionality
- Real-time chat during meetings

### 5. **Modern UI/UX**
- Responsive design for all screen sizes
- Professional color palette maintained
- Smooth animations and transitions
- Clean, modern interface

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account (for authentication and database)
- Cloudinary account (for image uploads)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd procomm-app
```

2. **Install all dependencies**
```bash
npm run install-all
```

3. **⚠️ IMPORTANT: Set up environment variables**

Create a `.env` file in the `client` directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudinary Configuration
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

**How to get these credentials:**
- **Firebase**: Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Project Settings → General → Your apps
- **Cloudinary**: Sign up at [Cloudinary](https://cloudinary.com/) → Settings → Upload → Create unsigned upload preset

⚠️ **NEVER commit the `.env` file to Git!** It's already in `.gitignore`.

4. **Start the development environment**
```bash
npm run dev
```

This will start:
- React frontend on `http://localhost:3000`
- Node.js backend on `http://localhost:3001`  
- PeerJS server on `http://localhost:3002`

### Individual Commands

- **Frontend only**: `npm run client`
- **Backend only**: `npm run server`  
- **PeerJS server only**: `npm run peer`

## 🔧 Configuration

### Environment Variables (Server)
Create a `.env` file in the `server` directory:

```env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000
PEER_HOST=localhost
PEER_PORT=3002
```

## 📱 Usage

### Creating a Meeting
1. Go to the Dashboard
2. Click "New Meeting"
3. Add meeting title and description
4. Invite participants by email
5. Start the meeting or share the meeting link

### Joining a Meeting  
1. Click "Join Meeting" on the Dashboard
2. Enter the meeting ID or link
3. Provide your name and email
4. Join the meeting (email must be on the invited list)

### Using the Chatbot
1. Click the chat icon in the bottom-right corner
2. Type messages or use the microphone for voice input
3. Get help with ProComm features and troubleshooting

### Theme Toggle
1. Go to Profile → Settings
2. Use the Theme toggle to switch between Light/Dark mode
3. Setting is automatically saved to localStorage

## 🎨 Design System

### Color Palette
- **Primary Blue**: `#2563eb` (maintained from original)
- **Success Green**: `#28a745` 
- **Gray Scale**: Various shades for backgrounds and text
- **Dark Mode**: Adjusted colors for dark theme

### Typography
- **Font**: 'Segoe UI', Arial, sans-serif
- **Responsive text sizes**
- **Consistent font weights**

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Set up SSL certificates for production

### ✅ Security Audit Completed (January 2, 2026)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License  
This project is licensed as **All Rights Reserved** © 2025 Varun Kumar R.  

You may not use, copy, modify, or distribute this project without prior permission.  
For permission requests, please contact me: enquiretovarun@gmail.com  

See the [LICENSE](./LICENSE) file for details.

--- 

## 👨‍💻 Author

**Varun Kumar R** - Software Developer

---

## 🎉 What's New in Version 2.0

- **Complete React Migration** - Converted from HTML/CSS/JS to modern React
- **Enhanced UI/UX** - Professional, modern design with improved user experience  
- **Theme System** - Dark/Light mode toggle with persistence
- **Interactive Chatbot** - AI-powered assistant with voice and text input
- **Better Architecture** - Clean separation between frontend and backend
- **Improved Performance** - Optimized code and better resource management
- **Mobile Responsive** - Works seamlessly on all device sizes

The application maintains the same core functionality while providing a much more modern, professional, and user-friendly experience.
