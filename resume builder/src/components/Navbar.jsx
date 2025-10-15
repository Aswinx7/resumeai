import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const active = ({ isActive }) => isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'

  const handleLogout = async () => {
    await signOut()
    navigate('/signin')
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to={user ? '/dashboard' : '/'} className="font-semibold text-gray-900">
          Resume Builder
        </NavLink>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <NavLink to="/dashboard" className={active}>Dashboard</NavLink>
              <NavLink to="/resume" className={active}>Resume</NavLink>
              <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/signin" className={active}>Sign In</NavLink>
              <NavLink to="/signup" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Sign Up</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
