'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Contacts', href: '/contacts', icon: Users },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
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
              <Link href="/" className="text-xl font-bold">
                <span className='text-[#4F46E5]'>Due</span><span className='text-[#10B981]'>Mate</span>
              </Link>
            </div>
            {user && (
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
        </div>
      </div>
    </nav>
  );
}