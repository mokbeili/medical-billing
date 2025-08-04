"use client";

import { Check, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Physician {
  id: number;
  code: string;
  name: string;
  specialty: string;
  location: string;
  jurisdiction_id: number;
  physician_id: number;
  created_at: string;
  updated_at: string;
  rank?: number;
}

export default function PhysicianSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Physician[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPhysician, setSelectedPhysician] = useState<Physician | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);

  // Search effect
  useEffect(() => {
    const searchPhysicians = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/referring-physicians/public?search=${encodeURIComponent(
            searchQuery
          )}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Error searching physicians:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchPhysicians, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPhysician(null);
    setShowResults(false);
  };

  const handleSelectPhysician = (physician: Physician) => {
    setSelectedPhysician(physician);
    setSearchQuery(physician.name);
    setShowResults(false);
  };

  const handleRemoveSelection = () => {
    setSelectedPhysician(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Physician Search
              </h1>
              <p className="mt-2 text-gray-600">
                Search for referring physicians in our database
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Search Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Find a Referring Physician
            </h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, specialty, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Searching...
              </div>
            )}

            {showResults && searchResults.length > 0 && (
              <div className="mt-4 border border-gray-300 rounded-md max-h-96 overflow-auto">
                {searchResults.map((physician) => (
                  <button
                    key={physician.id}
                    type="button"
                    onClick={() => handleSelectPhysician(physician)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {physician.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Code: {physician.code}
                        </div>
                        <div className="text-sm text-gray-600">
                          {physician.specialty}
                        </div>
                        {physician.location && (
                          <div className="text-sm text-gray-500">
                            {physician.location}
                          </div>
                        )}
                      </div>
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showResults &&
              !isSearching &&
              searchResults.length === 0 &&
              searchQuery.length >= 2 && (
                <div className="mt-4 text-sm text-gray-500">
                  No physicians found. Please try a different search term.
                </div>
              )}
          </div>

          {/* Selected Physician */}
          {selectedPhysician && (
            <div className="mb-8">
              <div className="bg-green-50 border border-green-200 rounded-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-green-900">
                    Selected Physician
                  </h3>
                  <button
                    type="button"
                    onClick={handleRemoveSelection}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove Selection
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-green-800">Name:</span>{" "}
                    <span className="text-green-700">
                      {selectedPhysician.name}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">
                      Billing Code:
                    </span>{" "}
                    <span className="text-green-700">
                      {selectedPhysician.code}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">
                      Specialty:
                    </span>{" "}
                    <span className="text-green-700">
                      {selectedPhysician.specialty}
                    </span>
                  </div>
                  {selectedPhysician.location && (
                    <div>
                      <span className="font-medium text-green-800">
                        Location:
                      </span>{" "}
                      <span className="text-green-700">
                        {selectedPhysician.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Ready to get started?
            </h3>
            <p className="text-blue-700 mb-4">
              {selectedPhysician
                ? `Great! You've found ${selectedPhysician.name}. Register now to start using our medical billing platform.`
                : "Register for an account to access our comprehensive medical billing tools and services."}
            </p>
            <div className="flex space-x-4">
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Account
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            About Our Physician Database
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Comprehensive Coverage
              </h4>
              <p>
                Our database includes referring physicians from across Canada
                with up-to-date information on specialties, locations, and
                billing codes.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Easy Search</h4>
              <p>
                Search by physician name, specialty, location, or billing code
                to quickly find the information you need.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Verified Information
              </h4>
              <p>
                All physician information is regularly verified and updated to
                ensure accuracy for medical billing purposes.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Free Access</h4>
              <p>
                Search our physician database for free. Register for an account
                to access additional features and tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
