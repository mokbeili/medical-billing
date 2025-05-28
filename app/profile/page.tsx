"use client";

import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";

interface Address {
  street: string;
  unit: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface UserProfile {
  email: string;
  roles: string[];
  address: Address;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    email: "",
    roles: [],
    address: {
      street: "",
      unit: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess("Profile updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRoleToggle = (role: string) => {
    const newRoles = profile.roles.includes(role)
      ? profile.roles.filter((r) => r !== role)
      : [...profile.roles, role];
    setProfile({ ...profile, roles: newRoles });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Profile Settings
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Email Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email</h2>
            <input
              type="email"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Change Password
            </h2>
            <div className="space-y-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Roles Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Roles</h2>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={profile.roles.includes("PATIENT")}
                  onChange={() => handleRoleToggle("PATIENT")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span>Patient</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={profile.roles.includes("PHYSICIAN")}
                  onChange={() => handleRoleToggle("PHYSICIAN")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span>Physician</span>
              </label>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Address
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={profile.address.street}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, street: e.target.value },
                  })
                }
                placeholder="Street Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={profile.address.unit}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, unit: e.target.value },
                  })
                }
                placeholder="Apartment, suite, etc. (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={profile.address.city}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: { ...profile.address, city: e.target.value },
                    })
                  }
                  placeholder="City"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={profile.address.state}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: { ...profile.address, state: e.target.value },
                    })
                  }
                  placeholder="State/Province"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={profile.address.postalCode}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: {
                        ...profile.address,
                        postalCode: e.target.value,
                      },
                    })
                  }
                  placeholder="Postal Code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={profile.address.country}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: { ...profile.address, country: e.target.value },
                    })
                  }
                  placeholder="Country"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
