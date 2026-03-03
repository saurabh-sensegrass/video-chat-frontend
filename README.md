# CommSphere (VideoChat Frontend)

CommSphere is a premium, real-time 1-to-1 video chat application built with Next.js, WebRTC, and Socket.io. It supports encrypted authentication-based video calls as well as instant guest rooms, giving users the ultimate flexibility to communicate securely and beautifully.

## 🚀 Features

### Core Experience

- **1-to-1 Video Calls**: Real-time video conferencing powered by WebRTC.
- **Instant Guest Rooms**: Create rooms instantly for quick meetings, requiring no sign-in.
- **Authenticated Chat**: Encrypted end-to-end messaging for registered users via NextAuth.
- **Screen Sharing**: Effortlessly share your screen with a click.
- **Premium UI**: Seamless dark-mode design with Tailwind CSS and Lucide icons.
- **Progressive Web App (PWA)**: Installable app support with native permission prompts (Camera, Mic, Notifications).

### Host & Call Controls

- **Permission Management**: The room host has strict control over the guest's microphone and camera.
- **Kick Users**: Hosts can eject guests from the room fully synced across clients.
- **Adaptive UI**: PiP (Picture-in-Picture) mirroring is handled natively (front camera mirrors, back camera doesn't).
- **Responsive Navigation**: A mobile-optimized layout with 100dvh support to eliminate browser scrolling artifacts.

## 🛠️ Built With

- **[Next.js 15 (App Router)](https://nextjs.org/)**: The React Framework for the Web.
- **[React 19](https://react.dev/)**: Component-driven UI library.
- **[WebRTC](https://webrtc.org/)**: For peer-to-peer real-time media streaming.
- **[Socket.io-client](https://socket.io/)**: Real-time event-based signaling.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework for rapid UI development.
- **[Lucide React](https://lucide.dev/)**: Beautiful and consistent iconography.
- **[NextAuth.js](https://next-auth.js.org/)**: Authentication solution for Next.js.
- **[Zustand / Context API]**: Application state management.

## 📦 Getting Started

### Prerequisites

Make sure you have Node.js (v18+) and npm installed. You also need the backend server running.

### Installation

1. **Clone the repository** and navigate to the `frontend` folder.
2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the root of the `frontend` directory and add the following:

   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
   # Add your NextAuth options here (NextAuth Secret, etc.)
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## ⚙️ Building for Production

To create an optimized production build:

```bash
npm run build
```

Then start the production server:

```bash
npm run start
```

## 📱 Progressive Web App (PWA)

CommSphere is designed as a PWA. When running in supported browsers (or installed locally), you can install the app natively to your desktop or mobile device. Native installations include automated prompts for necessary app permissions (Microphone, Camera, Notifications).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

_Powered by Next.js and WebRTC_
