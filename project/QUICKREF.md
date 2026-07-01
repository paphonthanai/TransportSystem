# Development Quick Reference

## Key Commands

```bash
# Start development
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint (add if configured)
npm run lint

# Format (add if configured)  
npm run format
```

## File Locations

| Task | Location |
|------|----------|
| Create a component | `src/components/ComponentName.vue` |
| Create a page | `src/views/PageNameView.vue` |
| Add a store | `src/stores/storeName.ts` |
| Add a composable | `src/composables/useComposableName.ts` |
| Add types | `src/types/index.ts` |
| Add utilities | `src/utils/utilityName.ts` |
| Add routes | `src/router/index.ts` |
| Style globals | `src/styles/main.css` |

## Common Patterns

### Component Template

```vue
<template>
  <div class="space-y-4">
    <!-- Content -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// State
const count = ref(0)

// Computed
const doubled = computed(() => count.value * 2)

// Methods
const increment = () => {
  count.value++
}
</script>

<style scoped>
/* Component styles */
</style>
```

### Using Stores

```typescript
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// Read
const isDark = appStore.isDarkMode

// Modify
appStore.toggleDarkMode()
```

### Using Services

```typescript
import { bookingService } from '@/services/firestore'
import { Booking } from '@/types'

// Create
const id = await bookingService.create(newBooking)

// Read
const booking = await bookingService.read(id)

// Update
await bookingService.update(id, updates)

// Delete
await bookingService.delete(id)
```

### Using Composables

```typescript
import { useFetch } from '@/composables/useFetch'
import { useForm } from '@/composables/useForm'

// Fetch data
const { data, loading, error, execute } = useFetch(
  () => bookingService.readAll(),
  { immediate: true }
)

// Handle form
const { values, errors, handleSubmit } = useForm(
  { name: '', email: '' },
  async (formData) => {
    // Submit logic
  }
)
```

### Formatting and Utils

```typescript
import { 
  formatCurrency, 
  formatDate, 
  calculateIncome 
} from '@/utils/format'

// Format
const price = formatCurrency(1000) // ฿1,000
const date = formatDate(new Date()) // 28 มิ.ย. 2569
const income = calculateIncome('ton', 100, 0, 5) // 500
```

## Tailwind CSS Classes

### Common Classes

```vue
<!-- Flex layout -->
<div class="flex items-center gap-4">

<!-- Grid layout -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-6">

<!-- Text -->
<h1 class="text-2xl font-bold text-text">
<p class="text-sm text-muted">

<!-- Colors -->
<div class="bg-primary text-white"> <!-- Primary -->
<div class="bg-surface border border-border"> <!-- Surface -->
<div class="bg-surface-2"> <!-- Surface 2 -->

<!-- Spacing -->
<div class="p-4 m-2 gap-3">

<!-- Responsive -->
<div class="hidden md:block"> <!-- Hide on mobile, show on tablet+ -->
<div class="flex md:hidden"> <!-- Show on mobile, hide on tablet+ -->
```

## Vue Router

### Add a New Route

Edit `src/router/index.ts`:

```typescript
{
  path: 'new-route',
  name: 'NewRoute',
  component: () => import('@/views/NewRouteView.vue'),
  meta: { requiresAuth: true },
}
```

### Navigate

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// Programmatic navigation
router.push('/dashboard')
router.push({ name: 'NewRoute' })
```

## Type Safety

### Define Types

```typescript
// src/types/index.ts
export interface MyEntity {
  id: string
  name: string
  status: 'active' | 'inactive'
}
```

### Use Types

```typescript
import { MyEntity } from '@/types'

const entity: MyEntity = {
  id: '1',
  name: 'Example',
  status: 'active',
}
```

## Firebase Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Responsive Breakpoints

Tailwind CSS breakpoints used:

- `xs` (0px) - Mobile
- `sm` (640px) - Small tablet
- `md` (768px) - Tablet
- `lg` (1024px) - Desktop
- `xl` (1280px) - Large desktop
- `2xl` (1536px) - Extra large

## CSS Variables

Available in templates:

```css
--primary: #2563eb;
--primary-soft: #eff6ff;
--surface: #fff;
--surface-2: #f8fafc;
--text: #0f172a;
--muted: #64748b;
--border: #e6e9f2;
--bg: #f4f6fb;
--shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

Use in CSS:

```css
.my-element {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}
```

## Common Icons (Material Symbols)

```
dashboard
assignment
local_shipping
person
settings
chart_bar
search
menu
close
edit
delete
add
download
upload
logout
notification
dark_mode
light_mode
```

Use in templates:

```vue
<span class="material-symbols-rounded">dashboard</span>
```

## Debugging

### Browser DevTools

- Open: `F12` or `Right-click > Inspect`
- Vue DevTools extension recommended
- Check Network tab for API calls
- Check Console for errors

### Console Logging

```typescript
// Log variables
console.log('myVar:', myVar)

// Log grouped messages
console.group('Group')
console.log('Message 1')
console.log('Message 2')
console.groupEnd()

// Warn and error
console.warn('Warning message')
console.error('Error message')
```

### Source Maps

Maps are enabled in development for better debugging.

## Performance

### Lazy Loading Components

```typescript
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(
  () => import('@/components/HeavyComponent.vue')
)
```

### Lazy Loading Routes

Already configured - check `src/router/index.ts` for examples.

## Git Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push

# Pull
git pull
```

## Commit Message Format

```
feat: add new booking form
fix: correct currency formatting bug  
docs: update README
refactor: extract common logic
style: format code
test: add unit tests
chore: update dependencies
```

## Resources

- [Vue 3 Docs](https://vuejs.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [DaisyUI Components](https://daisyui.com/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Pinia Docs](https://pinia.vuejs.org/)
- [TypeScript Docs](https://www.typescriptlang.org/)

## Useful Extensions (VS Code)

- Vue - Official extension by Pine Wu
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint (if using)
- Thunder Client (API testing)

## Keyboard Shortcuts

- `Ctrl+K+S` - Show all keyboard shortcuts
- `Ctrl+Shift+P` - Command palette
- `F2` - Rename symbol
- `Ctrl+/` - Toggle comment
- `Alt+Shift+Down` - Copy line down
- `Shift+Alt+Up` - Move line up

---

**Keep this file bookmarked for quick reference!** 📚
