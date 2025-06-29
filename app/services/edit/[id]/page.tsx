"use client";

import ServiceForm from "@/app/components/forms/serviceForm";
import Layout from "@/app/components/layout/Layout";
import { useParams } from "next/navigation";

export default function EditServicePage() {
  const params = useParams();
  const serviceId = params.id as string;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Edit Service</h1>
        <ServiceForm type="edit" serviceId={serviceId} />
      </div>
    </Layout>
  );
}
