"use client";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Myon Health
        </h1>

        <p className="text-2xl text-gray-600 leading-relaxed">
          Revolutionizing Medical Billing in Saskatchewan
        </p>

        <div className="space-y-6 text-lg text-gray-600">
          <p>
            Myon Health is bringing cutting-edge AI-enabled search and mobile
            tools to Saskatchewan physicians, transforming the way medical
            billing is handled.
          </p>

          <p>
            Our innovative platform will streamline your billing processes,
            reduce administrative burden, and help you focus on what matters
            most - patient care.
          </p>
        </div>

        <div className="pt-8">
          <div className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Coming Soon
          </div>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          <p>
            Stay tuned for our launch. We're working hard to bring you the best
            medical billing solution.
          </p>
        </div>
      </div>
    </main>
  );
}
