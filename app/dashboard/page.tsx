"use client";

import Layout from "../components/layout/Layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { AIPromptsTable } from "./components/ai-prompts-table";
import { BillingCodesTable } from "./components/billing-codes-table";

export default function DashboardPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Manage billing codes and AI prompts for different jurisdictions
              and providers
            </p>
          </div>

          <Tabs defaultValue="billing-codes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="billing-codes">Billing Codes</TabsTrigger>
              <TabsTrigger value="ai-prompts">AI Prompts</TabsTrigger>
            </TabsList>

            <TabsContent value="billing-codes">
              <BillingCodesTable />
            </TabsContent>

            <TabsContent value="ai-prompts">
              <AIPromptsTable />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </Layout>
  );
}
