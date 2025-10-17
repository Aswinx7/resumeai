import { NavLink } from 'react-router-dom'

export default function Navbar() {
  const active = ({ isActive }) => isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/resume" className="font-bold text-3xl flex items-center gap-1 hover:scale-105 transition-transform">
          <span className="text-black-550">Job</span>
          <span className="text-green-550">iffy</span>
        </NavLink>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
            title="Download as PDF"
          >
            Download
          </button>
        </div>
      </div>
    </header>
  )
}
