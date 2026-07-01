# THANTHARA TMS - Transportation Management System

A modern, responsive web application for managing transportation operations built with Vue 3, Firebase, and DaisyUI.

## Features

- **Dashboard** - Overview with KPIs, revenue charts, and recent activities
- **Booking Management** - Create and manage transportation bookings
- **Dispatch** - Assign vehicles and drivers to jobs
- **Jobs Tracking** - Monitor delivery status and job progress
- **Workflow Management** - Track workflow stages for each job
- **Customer Management** - Manage customer information and records
- **Driver Management** - Track driver information and income
- **Vehicle Management** - Monitor vehicle status and maintenance
- **Document Management** - Create and manage shipping documents
- **Billing System** - Generate invoices and receipts
- **Reports** - Analytics and reporting features
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Dark Mode** - Comfortable viewing in low-light environments
- **Real-time Updates** - Firebase integration for live data

## Tech Stack

- **Frontend Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Tailwind CSS with DaisyUI
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Icons**: Material Symbols
- **Charts**: Chart.js

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── config/             # Configuration files (Firebase)
├── layouts/            # Layout components (MainLayout)
├── router/             # Vue Router configuration
├── stores/             # Pinia stores (auth, app)
├── styles/             # Global CSS and Tailwind setup
├── views/              # Page components for each route
├── App.vue             # Root component
└── main.ts             # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Firebase account with project setup

### Installation

1. **Navigate to project directory**
```bash
cd d:\Transport\ui-ux\project
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
Copy `.env.example` to `.env.local` and update with your Firebase credentials:
```bash
cp .env.example .env.local
```

4. **Update Firebase Configuration**
Edit `.env.local` with your actual Firebase project credentials.

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create a production-ready build:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

### Type Checking

Check TypeScript types:

```bash
npm run type-check
```

## Demo Credentials

Use these credentials to test the application:

- **Admin**: `admin@thanthara.co.th` / `password123`
- **Manager**: `manager@thanthara.co.th` / `password123`
- **Dispatcher**: `dispatcher@thanthara.co.th` / `password123`

## Key Features Explained

### Dashboard
- Two variants: Overview (variant A) and Chart Focus (variant B)
- Real-time KPI cards showing key metrics
- Revenue and trip charts
- Top customers and drivers lists
- Recent jobs and running vehicles

### Booking System
- Create new transportation bookings
- Calculate driver income based on multiple rate types:
  - Per ton
  - Per trip
  - Per piece
- Add fuel and allowance costs
- Live calculation summary
- Form validation and error handling

### Responsive Design

The application is fully responsive:
- **Desktop**: Full-featured sidebar navigation
- **Tablet**: Adaptive layout with collapsible sidebar
- **Mobile**: Touch-friendly interface with hamburger menu

### Dark Mode

Users can toggle between light and dark themes. Preference is saved to localStorage.

### State Management with Pinia

- **Auth Store**: Handles Firebase authentication
- **App Store**: Manages UI state, theme, role, and sidebar visibility

## Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Set up Storage for documents
5. Copy your credentials to `.env.local`

## Design System

### Colors
- Primary: `#2563EB`
- Success: `#10b981`
- Warning: `#f97316`
- Error: `#ef4444`
- Muted: `#64748b`

### Typography
- Font Family: IBM Plex Sans Thai, IBM Plex Sans
- Icon Set: Material Symbols Rounded

### Spacing
Based on Tailwind's spacing scale with 4px unit

### Components
- Cards with border and shadow
- Buttons (primary, secondary, icon)
- Form inputs with validation states
- Badges and status indicators
- Tables with responsive overflow
- Modals and dialogs

## API Integration

The app uses Firebase services:
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage

Examples for data operations can be found in the stores.

## Performance Optimizations

- Code splitting with dynamic imports
- Lazy loading of routes
- Image optimization
- CSS minimization
- JavaScript minification

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Port already in use
```bash
npm run dev -- --port 5174
```

### Firebase not connecting
- Check `.env.local` configuration
- Verify Firebase project is active
- Check browser console for errors

### Styles not applying
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server
- Rebuild Tailwind CSS: `npm run dev`

## Contributing

When adding new features:
1. Create components in `src/components/`
2. Create views in `src/views/`
3. Update routes in `src/router/index.ts`
4. Add stores in `src/stores/` if needed
5. Follow the existing code style
6. Test responsive design

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist/` folder to your hosting:
   - Vercel
   - Netlify
   - GitHub Pages
   - Firebase Hosting
   - AWS S3 + CloudFront

## License

© 2569 THANTHARA Co., Ltd. All rights reserved.

## Support

For issues or questions, contact the development team.
