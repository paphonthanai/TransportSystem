import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/config/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  const userInitial = computed(() => {
    if (!user.value) return ''
    const name = user.value.displayName || user.value.email || 'U'
    return name.charAt(0).toUpperCase()
  })

  const userName = computed(() => {
    return user.value?.displayName || user.value?.email || 'User'
  })

  // Initialize auth state
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
  })

  const role = ref<string | null>(null)

  // Demo credentials: used for client-facing preview builds so the demo login
  // works without needing real Firebase Auth accounts. Matched by email regardless
  // of dev/production build; any other email falls through to real Firebase Auth.
  const demoCredentials: Record<string, { password: string; name: string; role: string }> = {
    'admin@thanthara.co.th': { password: 'password123', name: 'Admin User', role: 'admin' },
    'manager@thanthara.co.th': { password: 'password123', name: 'Manager User', role: 'manager' },
    'dispatcher@thanthara.co.th': { password: 'password123', name: 'Dispatcher User', role: 'dispatcher' },
    'driver@thanthara.co.th': { password: 'password123', name: 'สมชาย ทองดี', role: 'driver' },
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const credentials = demoCredentials[email as keyof typeof demoCredentials]
      if (!credentials) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (credentials.password !== password) {
          throw new Error('Invalid email or password')
        }

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Create mock user object
        const mockUser = {
          uid: 'mock-uid-' + Math.random(),
          email: email,
          displayName: credentials.name,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          phoneNumber: null,
          photoURL: null,
          tenantId: null,
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({ token: 'mock-token', expirationTime: new Date().toISOString() }),
          reload: async () => {},
          toJSON: () => ({}),
          delete: async () => {},
          getDisplayName: () => credentials.name,
          toFirebaseJSON: () => ({})
        } as unknown as User
        
        user.value = mockUser
        role.value = credentials.role
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await signOut(auth)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      user.value = null
      role.value = null
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    role,
    isAuthenticated,
    userInitial,
    userName,
    login,
    logout,
  }
})
