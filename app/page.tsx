"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Layout from "./components/layout/Layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="bg-white text-gray-900 min-h-screen py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Medical Billing Made Easy</h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Myon Health helps physicians in Saskatchewan and Manitoba streamline
            their billing so they can spend more time with patients, not
            paperwork.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline">
                Search Billing Codes
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 bg-gray-50 py-12">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div>
              <h2 className="text-xl font-semibold mb-2">Saskatchewan</h2>
              <p>
                Bill faster with tools optimized for the Saskatchewan Medical
                Services Plan. Myon Health supports MSB billing codes,
                submissions, and rejections.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Manitoba</h2>
              <p>
                Easily manage your Manitoba Health claims. Automatically
                validate tariff codes and avoid costly rejections with real-time
                feedback.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">All in One Place</h2>
              <p>
                Track claims, see rejections, and manage follow-ups. Myon Health
                gives you a centralized platform to reduce errors and maximize
                your revenue.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Myon Health. All rights reserved.
          </p>
        </div>
      </div>
    </Layout>
  );
}
