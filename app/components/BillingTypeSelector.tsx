"use client";

import { useEffect, useState } from "react";
import { useBillingType } from "../contexts/BillingTypeContext";

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

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  physicians?: {
    id: string;
    firstName: string;
    lastName: string;
    physicianBillingTypes: PhysicianBillingType[];
  }[];
}

const BillingTypeSelector = () => {
  const { activeBillingType, setActiveBillingType } = useBillingType();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserWithPhysicians();
  }, []);

  const fetchUserWithPhysicians = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);

        // Find and set active billing type
        const activeType = userData.physicians
          ?.find((physician: any) =>
            physician.physicianBillingTypes?.find((bt: any) => bt.active)
          )
          ?.physicianBillingTypes?.find((bt: any) => bt.active);

        setActiveBillingType(activeType || null);
      }
    } catch (error) {
      console.error("Error fetching user with physicians:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBillingTypeChange = async (
    physicianId: string,
    physicianBillingTypeId: number
  ) => {
    try {
      setLoading(true);
      await fetch(
        `/api/physician-billing-types/${physicianId}/${physicianBillingTypeId}/active`,
        {
          method: "PUT",
        }
      );

      // Refresh data
      await fetchUserWithPhysicians();
    } catch (error) {
      console.error("Error updating billing type:", error);
      alert("Failed to update billing type. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (
    !user?.physicians ||
    user.physicians.length === 0 ||
    !user.physicians.some(
      (physician) => (physician.physicianBillingTypes?.length || 0) >= 2
    )
  ) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Billing Types
      </h3>
      <div className="space-y-4">
        {user.physicians.map((physician) => (
          <div
            key={physician.id}
            className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
          >
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Dr. {physician.firstName} {physician.lastName}
            </h4>
            <div className="space-y-2">
              {physician.physicianBillingTypes
                .sort((a, b) =>
                  a.billingType.title.localeCompare(b.billingType.title)
                )
                .map((billingType) => (
                  <label
                    key={billingType.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name={`billing-type-${physician.id}`}
                      checked={billingType.active}
                      onChange={() =>
                        handleBillingTypeChange(physician.id, billingType.id)
                      }
                      disabled={loading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div
                      className="w-4 h-4 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: billingType.colorCode }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {billingType.billingType.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        Code: {billingType.billingType.code}
                      </div>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingTypeSelector;
