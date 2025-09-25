import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authAPI } from "../services/api";
import { PhysicianBillingType, User } from "../types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeBillingType: PhysicianBillingType | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  signUp: (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => Promise<boolean>;
  updateActiveBillingType: (billingType: PhysicianBillingType | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBillingType, setActiveBillingType] =
    useState<PhysicianBillingType | null>(null);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Load active billing type from stored user data
        if (userData.physicians) {
          const activeType = userData.physicians
            ?.find((physician: any) =>
              physician.physicianBillingTypes?.find((bt: any) => bt.active)
            )
            ?.physicianBillingTypes?.find((bt: any) => bt.active);
          setActiveBillingType(activeType || null);
        } else {
          // If no physicians data, try to fetch full user data
          try {
            const fullUserData = await authAPI.getUserWithPhysicians();
            setUser(fullUserData);
            await AsyncStorage.setItem("user", JSON.stringify(fullUserData));

            if (fullUserData.physicians) {
              const activeType = fullUserData.physicians
                ?.find((physician: any) =>
                  physician.physicianBillingTypes?.find((bt: any) => bt.active)
                )
                ?.physicianBillingTypes?.find((bt: any) => bt.active);
              setActiveBillingType(activeType || null);
            }
          } catch (error) {
            console.error("Error fetching user with physicians:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authAPI.signIn(email, password);

      if (response.user) {
        setUser(response.user);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));

        // Fetch full user data with physicians and billing types
        try {
          const fullUserData = await authAPI.getUserWithPhysicians();
          setUser(fullUserData);
          await AsyncStorage.setItem("user", JSON.stringify(fullUserData));

          // Set active billing type if available
          if (fullUserData.physicians) {
            const activeType = fullUserData.physicians
              ?.find((physician: any) =>
                physician.physicianBillingTypes?.find((bt: any) => bt.active)
              )
              ?.physicianBillingTypes?.find((bt: any) => bt.active);
            setActiveBillingType(activeType || null);
          }
        } catch (error) {
          console.error("Error fetching user with physicians:", error);
          // If fetching full data fails, still proceed with basic user data
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sign in error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authAPI.signUp(userData);

      if (response.user) {
        setUser(response.user);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sign up error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authAPI.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setUser(null);
      setActiveBillingType(null);
      await AsyncStorage.removeItem("user");
    }
  };

  const updateActiveBillingType = (
    billingType: PhysicianBillingType | null
  ) => {
    setActiveBillingType(billingType);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    activeBillingType,
    signIn,
    signOut,
    signUp,
    updateActiveBillingType,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
