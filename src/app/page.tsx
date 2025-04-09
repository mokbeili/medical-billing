import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Medical Billing Code Search
        </h1>
        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg">
          Search and find medical billing codes quickly and efficiently
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/search"
            className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
          >
            Start Searching
          </Link>
        </div>
      </div>
    </div>
  );
}
