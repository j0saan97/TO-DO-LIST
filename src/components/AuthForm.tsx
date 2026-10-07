import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signIn' | 'signUp'

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
      setError(error.message)
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
