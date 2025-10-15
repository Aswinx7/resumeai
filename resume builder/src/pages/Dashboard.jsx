import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 text-sm">Signed in as {user?.email}</p>
          </div>
          <button onClick={signOut} className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black">Log out</button>
        </div>
        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <p className="text-gray-700">Welcome! Next we will add Resume & Cover Letter builder features here.</p>
        </div>
      </div>
    </div>
  )
}
