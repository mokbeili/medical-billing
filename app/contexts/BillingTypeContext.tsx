"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface BillingType {
  id: number;
  code: string;
  title: string;
  jurisdictionId: number;
}

interface PhysicianBillingType {
  id: number;
  physicianId: string;
  billingTypeId: number;
  active: boolean;
  colorCode: string;
  billingType: BillingType;
}

interface BillingTypeContextType {
  activeBillingType: PhysicianBillingType | null;
  setActiveBillingType: (billingType: PhysicianBillingType | null) => void;
}

const BillingTypeContext = createContext<BillingTypeContextType | undefined>(
  undefined
);

export const useBillingType = () => {
  const context = useContext(BillingTypeContext);
  if (context === undefined) {
    throw new Error("useBillingType must be used within a BillingTypeProvider");
  }
  return context;
};

interface BillingTypeProviderProps {
  children: React.ReactNode;
}

export const BillingTypeProvider: React.FC<BillingTypeProviderProps> = ({
  children,
}) => {
  const [activeBillingType, setActiveBillingType] =
    useState<PhysicianBillingType | null>(null);

  // Load active billing type from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("activeBillingType");
    if (stored) {
      try {
        setActiveBillingType(JSON.parse(stored));
      } catch (error) {
        console.error("Error parsing stored billing type:", error);
      }
    }
  }, []);

  // Save to session storage when active billing type changes
  useEffect(() => {
    if (activeBillingType) {
      sessionStorage.setItem(
        "activeBillingType",
        JSON.stringify(activeBillingType)
      );
    } else {
      sessionStorage.removeItem("activeBillingType");
    }
  }, [activeBillingType]);

  return (
    <BillingTypeContext.Provider
      value={{ activeBillingType, setActiveBillingType }}
    >
      {children}
    </BillingTypeContext.Provider>
  );
};
