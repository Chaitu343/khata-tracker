// apps/frontend/src/app/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function HomePage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/signin');
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    // You can return a loading spinner here
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Basic Navbar Example */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center text-xl font-bold text-indigo-600">
                Khata Tracker
              </div>
            </div>
            <div className="flex items-center">
              {user && (
                <>
                  <span className="mr-4 text-sm text-gray-600">Welcome, {user.name || user.email}!</span>
                  <Button
                    onClick={logout}
                    variant="destructive"
                    size="sm"
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Replace with your actual dashboard content */}
            <div className="py-4">
              <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
                <p className="text-gray-700">Your dashboard content will go here.</p>
                <p className="text-gray-700">Currently logged in as: {user?.email}</p>
              </div>
            </div>
            {/* /End replace */}
          </div>
        </div>
      </main>
    </div>
  );
}