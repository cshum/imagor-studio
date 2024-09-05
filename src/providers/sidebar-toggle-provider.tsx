import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { ConfigStorage } from '@/lib/config-storage/config-storage';

interface SidebarToggleContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarToggleContext = createContext<SidebarToggleContextType | undefined>(undefined);

interface SidebarToggleProviderProps {
  children: ReactNode;
  storage: ConfigStorage;
}

export const SidebarToggleProvider = ({ children, storage }: SidebarToggleProviderProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [loaded, setLoaded] = useState(false);

  // Load the sidebar state from storage
  useEffect(() => {
    const loadSidebarState = async () => {
      const storedState = await storage.get();
      if (storedState !== null) {
        setIsOpen(storedState === 'true');
      }
      setLoaded(true);
    };
    loadSidebarState();
  }, [storage]);

  // Toggle the sidebar state and save it to storage
  const toggleSidebar = async () => {
    const newState = !isOpen;
    setIsOpen(newState);
    await storage.set(String(newState)); // Store the state as a string 'true' or 'false'
  };

  if (!loaded) {
    return null; // Optionally return a loading indicator if desired
  }

  return (
    <SidebarToggleContext.Provider value={{ isOpen, toggleSidebar }}>
      {children}
    </SidebarToggleContext.Provider>
  );
};

// Custom hook to use the sidebar toggle context
export const useSidebarToggle = () => {
  const context = useContext(SidebarToggleContext);
  if (!context) {
    throw new Error('useSidebarToggle must be used within a SidebarToggleProvider');
  }
  return context;
};
