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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/physician-search"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Search Physicians
            </a>
            <a
              href="/search"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-blue-600 bg-white border border-blue-600 rounded-md shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              AI Code Search
            </a>
            <a
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Get Started
            </a>
          </div>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          <p>
            Try our physician search and AI code search features today. Register
            to access our full medical billing platform.
          </p>
        </div>
      </div>
    </main>
  );
}
