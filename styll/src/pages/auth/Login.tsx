import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Scissors } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { loginSchema, type LoginFormData } from '../../lib/utils/validators'

const Login: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setGlobalError('Email o password non corretti. Riprova.')
    } else {
      navigate('/dashboard/home')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Styll</h1>
          <p className="text-gray-500 text-sm mt-1">Accedi alla tua dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="marco@barbershop.it"
              error={errors.email?.message}
              autoComplete="email"
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="La tua password"
              error={errors.password?.message}
              autoComplete="current-password"
              required
              {...register('password')}
            />

            {globalError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">
                {globalError}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              size="lg"
            >
              Accedi
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Password dimenticata?
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Non hai un account?{' '}
          <Link
            to="/auth/register"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Registrati
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
