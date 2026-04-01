import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Scissors, Check } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { registerSchema, type RegisterFormData } from '../../lib/utils/validators'

const STEPS = ['Account', 'Salone', 'Conferma']

const Register: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormData) => {
    setGlobalError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error('Errore nella creazione utente')

      await db.from('profiles').insert({ id: userId, user_type: 'staff', full_name: data.fullName, phone: data.phone })

      const slug = data.businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50)
      const { data: tenantData } = await db.from('tenants').insert({
        business_name: data.businessName,
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        timezone: 'Europe/Rome',
        primary_color: '#1a1a2e',
        secondary_color: '#e94560',
        font_family: 'Inter',
      }).select().single()

      if (tenantData) {
        await db.from('staff_members').insert({ tenant_id: tenantData.id, profile_id: userId, role: 'owner', is_active: true })
        await db.from('locations').insert({ tenant_id: tenantData.id, name: 'Sede principale', address: '', city: '', zip_code: '', is_active: true })
        await db.from('loyalty_configs').insert({ tenant_id: tenantData.id, is_active: true, template: 'classic', points_per_visit: 100, points_per_euro: 10, streak_threshold_days: 45, version: 1 })
        const { data: planData } = await db.from('subscription_plans').select('id').eq('slug', 'starter').single()
        if (planData) {
          const trialEnd = new Date()
          trialEnd.setDate(trialEnd.getDate() + 14)
          await db.from('tenant_subscriptions').insert({ tenant_id: tenantData.id, plan_id: planData.id, status: 'trial', trial_ends_at: trialEnd.toISOString() })
        }
      }
      navigate('/dashboard/home')
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crea il tuo account</h1>
          <p className="text-gray-500 text-sm mt-1">14 giorni gratis, nessuna carta</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {step === 0 && (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Il tuo account</h2>
                <Input label="Nome completo" placeholder="Marco Ferretti" error={errors.fullName?.message} required {...register('fullName')} />
                <Input label="Email" type="email" placeholder="marco@barbershop.it" error={errors.email?.message} required {...register('email')} />
                <Input label="Password" type="password" placeholder="Minimo 8 caratteri" error={errors.password?.message} required {...register('password')} />
                <Button type="button" fullWidth onClick={() => setStep(1)}>Avanti →</Button>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Il tuo salone</h2>
                <Input label="Nome del salone" placeholder="Marco's Barber Shop" error={errors.businessName?.message} required {...register('businessName')} />
                <Input label="Telefono" type="tel" placeholder="+39 333 1234567" error={errors.phone?.message} required {...register('phone')} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" fullWidth onClick={() => setStep(0)}>← Indietro</Button>
                  <Button type="button" fullWidth onClick={() => setStep(2)}>Avanti →</Button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Tutto pronto!</h2>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Nome</span><span className="font-medium">{getValues('fullName')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{getValues('email')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Salone</span><span className="font-medium">{getValues('businessName')}</span></div>
                </div>
                {globalError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">{globalError}</div>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" fullWidth onClick={() => setStep(1)}>← Indietro</Button>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>Crea account</Button>
                </div>
              </>
            )}
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Hai già un account?{' '}
          <Link to="/auth/login" className="text-[var(--color-primary)] font-medium hover:underline">Accedi</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
