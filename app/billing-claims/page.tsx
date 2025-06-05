"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import Layout from "../components/layout/Layout";

export default function BillingClaimsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing Claims</h1>
          <p className="mt-2 text-gray-600">
            Manage and process your medical billing claims efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/billing-claims/search">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Search Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Search and view existing billing claims by various criteria
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/billing-claims/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Create New Claim</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Create a new billing claim with service codes and physician
                  details
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/billing-claims/batch">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Batch Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Process multiple claims in batch for efficient submission
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/billing-claims/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View reports and analytics on your billing claims
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/billing-claims/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Configure billing claim settings and preferences
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/billing-claims/help">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get help and support for billing claim related issues
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
