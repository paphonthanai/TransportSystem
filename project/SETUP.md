# THANTHARA TMS - Installation & Setup Guide

## Quick Start Guide

This guide will help you set up and run the THANTHARA Transportation Management System on your local machine.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for version control)
- A text editor or IDE (VS Code recommended)

## Installation Steps

### 1. Clone or Navigate to Project

If you haven't already, navigate to the project directory:

```bash
cd d:\Transport\ui-ux\project
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- Vue 3 with TypeScript
- Firebase SDK
- Pinia (state management)
- Vue Router (routing)
- Tailwind CSS with DaisyUI
- Chart.js for charts
- Other utilities

**Installation time:** 3-5 minutes depending on internet speed

### 3. Configure Firebase

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Or create `.env.local` manually with the following content:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

To get these credentials:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Go to Project Settings (gear icon)
4. Find "Web App" and copy the configuration
5. Paste into `.env.local`

### 4. Start Development Server

Run the development server:

```bash
npm run dev
```

Output should show:
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 5. Access the Application

Open your browser and go to:
```
http://localhost:5173
```

You should see the login screen.

## Demo Credentials

To test the application, use these credentials:

**Admin User:**
- Email: `admin@thanthara.co.th`
- Password: `password123`

**Manager User:**
- Email: `manager@thanthara.co.th`
- Password: `password123`

**Dispatcher User:**
- Email: `dispatcher@thanthara.co.th`
- Password: `password123`

## Project Structure

```
d:\Transport\ui-ux\project\
├── src/
│   ├── components/          # Reusable Vue components
│   ├── composables/         # Vue composables (useForm, useFetch, etc.)
│   ├── config/              # Configuration (Firebase setup)
│   ├── layouts/             # Layout components
│   ├── router/              # Vue Router configuration
│   ├── services/            # Firestore services
│   ├── stores/              # Pinia state management
│   ├── styles/              # Global CSS and Tailwind
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── views/               # Page components
│   ├── App.vue              # Root component
│   └── main.ts              # Application entry point
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .env.example             # Environment variables template
├── .env.local               # Your local environment variables
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
└── SETUP.md                 # This file
```

## NPM Scripts

Available commands:

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Format code (if configured)
npm run format

# Lint code (if configured)
npm run lint
```

## Features Overview

### ✅ Implemented
- ✓ Responsive layout with sidebar
- ✓ Dashboard with KPI cards and charts
- ✓ Login/Authentication with Firebase
- ✓ Booking creation and management
- ✓ Dark mode toggle
- ✓ Role selector
- ✓ Search functionality
- ✓ Responsive design (mobile, tablet, desktop)
- ✓ Type-safe TypeScript setup
- ✓ Component-based architecture

### 🔄 Partially Implemented
- 🔄 Dispatch management
- 🔄 Job tracking
- 🔄 Workflow management
- 🔄 Document management
- 🔄 Reports

### 📋 To Be Implemented
- ⬜ Real-time data updates
- ⬜ Advanced filtering
- ⬜ PDF export functionality
- ⬜ Push notifications
- ⬜ Mobile app (native)

## Development Workflow

### 1. Creating a New Component

Create a new Vue file in `src/components/`:

```vue
<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <p>{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  content: String,
})
</script>

<style scoped>
.card {
  @apply bg-surface border border-border rounded-xl p-5;
}
</style>
```

### 2. Creating a New Page

Create a new Vue file in `src/views/`:

```vue
<template>
  <div class="space-y-6">
    <!-- Page content -->
  </div>
</template>

<script setup lang="ts">
// Page logic
</script>
```

Then add route in `src/router/index.ts`:

```typescript
{
  path: 'new-page',
  name: 'NewPage',
  component: () => import('@/views/NewPageView.vue'),
}
```

### 3. Using Pinia Stores

In a component:

```typescript
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// Access state
const isDarkMode = appStore.isDarkMode

// Use actions
appStore.toggleDarkMode()
```

### 4. Firebase Integration

Using Firestore service:

```typescript
import { bookingService } from '@/services/firestore'

// Create
const id = await bookingService.create({
  date: '2569-06-28',
  customer: 'ABC Corp',
})

// Read
const booking = await bookingService.read(id)

// Query
const bookings = await bookingService.query([
  where('customer', '==', 'ABC Corp'),
  orderBy('date', 'desc'),
])

// Update
await bookingService.update(id, { status: 'completed' })

// Delete
await bookingService.delete(id)
```

## Troubleshooting

### Issue: Port 5173 is already in use

**Solution:**
```bash
# Use a different port
npm run dev -- --port 5174
```

### Issue: Firebase connection error

**Solution:**
1. Check `.env.local` configuration
2. Verify Firebase project is active
3. Check browser console for error messages
4. Ensure Firebase security rules allow read/write

### Issue: Styles not loading

**Solution:**
```bash
# Clear cache and restart
npm run dev
# Or manually clear browser cache (Ctrl+Shift+Delete)
```

### Issue: TypeScript errors

**Solution:**
```bash
# Run type check
npm run type-check

# Check for type issues in IDE
# Make sure you're using TypeScript-aware editor
```

### Issue: Module not found error

**Solution:**
1. Check import paths (use `@/` for src directory)
2. Ensure component files are named correctly
3. Run `npm install` to reinstall dependencies

## Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

1. **Lazy load routes** - Heavy components are already lazy loaded
2. **Use compression** - Enable GZIP compression in production
3. **Optimize images** - Use appropriate image sizes
4. **Monitor bundle size** - Use `npm run build` to check
5. **Code splitting** - Routes are automatically code-split

## Building for Production

### 1. Create Production Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### 2. Test Production Build Locally

```bash
npm run preview
```

### 3. Deploy Options

**Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Option 2: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Option 3: Firebase Hosting**
```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy
```

**Option 4: Manual Upload**
- Upload contents of `dist/` folder to your web server
- Configure server to serve `index.html` for client-side routing

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Next Steps

1. **Customize branding** - Update company name, logo, colors
2. **Configure Firebase** - Set up authentication, database rules
3. **Add data** - Import customer and vehicle data
4. **Extend features** - Add more views and functionality
5. **Deploy** - Deploy to production server

## Getting Help

- Check the [README.md](./README.md) for overview
- Review the [original design](./TMS.dc.html) for reference
- Check component examples in `src/components/`
- Look at store implementations in `src/stores/`

## Support

For issues or questions about the setup:
1. Check this guide first
2. Review browser console for error messages
3. Contact the development team

## License

© 2569 THANTHARA Co., Ltd. All rights reserved.

---

**Happy coding! 🚀**
