// apps/frontend/src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Or your renamed hook
import { Button } from '@/components/ui/button';
import { Home, Users, LogOut } from 'lucide-react'; // Example icons

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Contacts', href: '/contacts', icon: Users },
  // Add other main navigation items here
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) { // Don't show Navbar if user is not logged in (e.g., on signin/signup pages)
    // Or, show a limited Navbar for unauthenticated users.
    // For now, let's assume signin/signup pages have their own minimal layout.
    // This logic might need adjustment based on how you handle layouts for auth pages.
    // A common pattern is to have a different layout for auth routes.
    // For simplicity here, we assume if no user, Navbar is not for them.
    // A more robust way is to check if pathname is '/signin' or '/signup'.
    if (pathname === '/signin' || pathname === '/signup') {
        return null;
    }
  }


  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                Khata Tracker
              </Link>
            </div>
            {user && ( // Only show main navigation if user is logged in
              <div className="hidden md:ml-10 md:flex md:items-baseline md:space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                      'inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium'
                    )}
                    aria-current={pathname === item.href ? 'page' : undefined}
                  >
                    <item.icon className="-ml-0.5 mr-2 h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {user && (
            <div className="hidden md:ml-4 md:flex md:flex-shrink-0 md:items-center">
                <span className="text-sm text-gray-600 mr-3">Hi, {user.name || user.email}</span>
              <Button onClick={logout} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
          {/* Add Mobile Menu Button here if needed */}
        </div>
      </div>
      {/* Mobile menu, show/hide based on menu state (for later) */}
    </nav>
  );
}