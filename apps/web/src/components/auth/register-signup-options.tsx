import { RegisterForm } from '@/components/auth/register-form'

interface RegisterSignupOptionsProps {
  initialStep?: 'identity' | 'activity'
  initialMethod?: 'credentials' | 'google'
  initialFullName?: string
  initialEmail?: string
}

export function RegisterSignupOptions(props: RegisterSignupOptionsProps) {
  return <RegisterForm {...props} />
}
