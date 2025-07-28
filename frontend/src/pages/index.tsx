import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && isAuthenticated && user) {
      router.push('/credits')
    }
  }, [isClient, isAuthenticated, user, router])

  // Show loading until client-side hydration is complete
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-950 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Redirecting to credits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {isLoginMode ? (
          <LoginForm
            onToggleMode={() => setIsLoginMode(false)}
            onForgotPassword={() => console.log('Forgot password')}
          />
        ) : (
          <RegisterForm
            onToggleMode={() => setIsLoginMode(true)}
          />
        )}
      </div>
    </div>
  )
}