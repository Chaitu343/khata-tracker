"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router

interface User {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  netBalance?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  contacts: User[]; // List of all contacts
  setContactsList: (contacts: User[]) => void;
  selectedContact: User | null; // For detail page
  setSelectedContact: (contact: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContactsState] = useState<User[]>([]);
  const [selectedContactState, setSelectedContactState] = useState<User | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    // Check for token in localStorage on initial load
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("authUser");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("authUser", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    router.push("/"); // Redirect to dashboard or home after login
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
    router.push("/signin"); // Redirect to signin after logout
  };

  const setContactsList = (newContacts: User[]) => {
    setContactsState(newContacts);
  };

  const setSelectedContact = (contact: User | null) => {
    setSelectedContactState(contact);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        contacts,
        setContactsList,
        selectedContact: selectedContactState,
        setSelectedContact,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
