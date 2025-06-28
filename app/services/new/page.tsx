"use client";

import ServiceForm from "@/app/components/forms/serviceForm";
import Layout from "@/app/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CreateServicePage() {
  const router = useRouter();
  const { status } = useSession();
  if (status === "loading") {
    return (
      <Layout>
        <div className="container mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </CardContent>
          </Card>
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
      <div className="container mx-auto p-4">
        <ServiceForm type="new" />
      </div>
    </Layout>
  );
}
