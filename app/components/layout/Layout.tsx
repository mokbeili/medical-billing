"use client";

import { useState } from "react";
import ActiveBillingBorder from "../ActiveBillingBorder";
import Footer from "./Footer";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ActiveBillingBorder />
      <div className="pt-24">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 mt-16 min-h-[calc(100vh-4rem-16rem)]">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
