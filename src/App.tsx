import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import AuthForm from './components/AuthForm'
import Board from './components/Board'
import { supabase } from './lib/supabase'

function App() {
  // undefined mientras se recupera la sesión guardada; null si no hay ninguna
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <main id="app">
      <h1>To-Do List</h1>
      {session === undefined ? (
        <p>Cargando...</p>
      ) : session === null ? (
        <AuthForm />
      ) : (
        <>
          <div className="session-bar">
            <span>{session.user.email}</span>
            <button type="button" onClick={() => supabase.auth.signOut()}>
              Cerrar sesión
            </button>
          </div>
          {/* La key reinicia el tablero al cambiar de usuario */}
          <Board key={session.user.id} />
        </>
      )}
    </main>
  )
}

export default App
