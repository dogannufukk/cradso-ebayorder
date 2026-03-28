import { Outlet } from 'react-router-dom';

export default function PortalLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">CRADSO</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Design Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white/60">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-gray-400">
          CRADSO Design Portal &middot; Powered by eBay Design Management System
        </div>
      </footer>
    </div>
  );
}
