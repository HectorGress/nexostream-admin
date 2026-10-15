'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth'
import { createClient } from '@/lib/supabase'
import { validarCorreo } from '@/lib/cuentas'
import { ShieldCheck, Mail, Lock, LogIn, UserPlus, Sun, Moon, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Validaciones antes de llamar a Firebase
    const correo = email.trim().toLowerCase()
    if (!validarCorreo(correo)) {
      setErrorMsg('Escribe un correo electrónico válido.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        // 1. Crear el usuario en Firebase Authentication (Evita el rate limit de SMTP)
        const userCredential = await createUserWithEmailAndPassword(auth, correo, password)
        const user = userCredential.user

        // 2. Mapear el perfil en la tabla 'profiles' de Supabase
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { id: user.uid, correo: user.email, rol: 'cliente' }
          ])

        if (profileError) {
          // No bloquea el registro: el panel del cliente crea el perfil si falta
          console.error("Error guardando el perfil en Supabase:", profileError)
        }

        // Redirección hacia la ruta exacta de cliente
        router.push('/cliente/dashboard')
      } else {
        // 1. Autenticar con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, correo, password)
        const user = userCredential.user

        // 2. Obtener el rol del usuario desde la tabla 'profiles' de Supabase
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('rol')
          .eq('id', user.uid)
          .maybeSingle()

        if (fetchError) {
          console.error("Error consultando el rol:", fetchError)
        }

        // Redirección según la estructura de carpetas activa
        if (profile?.rol === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/cliente/dashboard')
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('El correo electrónico ya está registrado.')
      } else if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password'
      ) {
        setErrorMsg('Usuario o contraseña incorrectos.')
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      } else if (error.code === 'auth/invalid-email') {
        setErrorMsg('Escribe un correo electrónico válido.')
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMsg('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
      } else if (error.code === 'auth/network-request-failed') {
        setErrorMsg('Sin conexión. Revisa tu internet e inténtalo de nuevo.')
      } else if (error.code === 'auth/user-disabled') {
        setErrorMsg('Esta cuenta está deshabilitada. Contacta al administrador.')
      } else {
        setErrorMsg('Ocurrió un error. Intenta nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full pl-11 py-3 rounded-xl text-sm border outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  }`

  const iconClass = `absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center relative overflow-hidden p-4 transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50/60 to-slate-100 text-slate-900'
    }`}>

      {/* Fondo decorativo suave */}
      <div className={`pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-200/50'}`} />
      <div className={`pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-200/50'}`} />
      
      {/* Botón de cambio de tema */}
      <button 
        type="button"
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`absolute top-5 right-5 px-4 py-2 text-sm font-medium rounded-full border flex items-center gap-2 transition shadow-sm ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
      </button>

      {/* Tarjeta principal */}
      <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-xl transition-colors ${
        isDarkMode 
          ? 'bg-slate-800/80 border-slate-700 shadow-black/30' 
          : 'bg-white border-slate-200 shadow-slate-300/50'
      }`}>
        
        {/* Header con icono de escudo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isRegister ? 'Registro de cliente' : 'Acceso al sistema'}
          </h1>
          <p className={`text-sm mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isRegister ? 'Crea una cuenta para acceder a tus servicios' : 'Ingresa tus credenciales para continuar'}
          </p>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div
            role="alert"
            className={`mb-5 p-3 rounded-xl border text-sm flex items-start gap-2 ${
              isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={18} className={iconClass} />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_correo@gmail.com"
                className={`${inputClass} pr-4`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Contraseña
            </label>
            <div className="relative">
              <Lock size={18} className={iconClass} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition ${
                  isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && (
              <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Mínimo 6 caracteres.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Cargando...</>
            ) : isRegister ? (
              <><UserPlus size={18} /> Crear cuenta de cliente</>
            ) : (
              <><LogIn size={18} /> Iniciar sesión</>
            )}
          </button>
        </form>

        {/* Toggle para intercambiar entre Login y Registro */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMsg('')
            }}
            className={`text-sm font-medium transition-colors ${
              isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            {isRegister 
              ? '¿Ya tienes una cuenta? Inicia sesión' 
              : '¿Eres cliente nuevo? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  )
}
