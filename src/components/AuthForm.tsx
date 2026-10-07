import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signIn' | 'signUp'

// Mensajes en español para los códigos de error de Supabase más habituales
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu email antes de entrar. Revisa tu correo.',
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 6 caracteres.',
  email_address_invalid: 'El email no es válido.',
  validation_failed: 'Revisa el email y la contraseña.',
  signup_disabled: 'El registro está desactivado.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a probar.',
  over_email_send_rate_limit:
    'Se han enviado demasiados correos. Espera un rato y vuelve a probar.',
}

const getErrorMessage = (code?: string) =>
  (code && ERROR_MESSAGES[code]) ||
  'No se pudo completar la operación. Revisa tu conexión y vuelve a probar.'

function AuthForm() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    const credentials = { email: email.trim(), password }
    const { data, error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)

    setIsSubmitting(false)
    if (error) {
      setError(getErrorMessage(error.code))
      return
    }
    // Con la confirmación por email activada, el registro no abre sesión todavía
    if (!data.session) {
      setNotice('Te hemos enviado un correo para confirmar tu cuenta.')
      setMode('signIn')
    }
  }

  const handleToggleMode = () => {
    setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
    setError('')
    setNotice('')
  }

  return (
    <form className="task-form auth-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={isSubmitting}>
        {mode === 'signIn' ? 'Entrar' : 'Crear cuenta'}
      </button>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}
      <button type="button" className="link-button" onClick={handleToggleMode}>
        {mode === 'signIn'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Entra'}
      </button>
    </form>
  )
}

export default AuthForm
