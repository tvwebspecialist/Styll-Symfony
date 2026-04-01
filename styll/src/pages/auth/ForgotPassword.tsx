import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setIsLoading(false)
    if (err) {
      setError('Qualcosa non ha funzionato. Verifica l\'email e riprova.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Password dimenticata?</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ti mandiamo un link per reimpostarla
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="font-semibold text-gray-900 mb-2">Email inviata!</h2>
              <p className="text-sm text-gray-500">
                Controlla la tua email. Hai ricevuto un link per reimpostare la password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email"
                type="email"
                placeholder="marco@barbershop.it"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
              )}
              <Button type="submit" fullWidth isLoading={isLoading}>
                Invia link di reset
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/auth/login" className="text-[var(--color-primary)] font-medium hover:underline">
            ← Torna al login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
