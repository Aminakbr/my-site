// app/page.tsx
"use client";
import Link from "next/link";

export default function HomePage() {
  const upsTypes = [
    { name: "Home UPS", path: "/home-ups", description: "For personal or small home appliances." },
    { name: "Office UPS", path: "/office-ups", description: "Reliable backup for offices and IT setups." },
    { name: "Hospital UPS", path: "/hospital-ups", description: "Medical-grade UPS for sensitive equipment." },
    { name: "Data Center UPS", path: "/data-center-ups", description: "For servers and network equipment." },
    { name: "Industrial UPS", path: "/industrial-ups", description: "Heavy-duty UPS for industrial systems." },
  ];

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">UPS Sizing Assistant ⚡</h1>
      <p className="text-gray-300 mb-12 text-center max-w-2xl">
        Choose the UPS category that fits your environment. Our smart calculator will help you find the perfect UPS size for your needs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {upsTypes.map((ups) => (
          <Link
            key={ups.path}
            href={ups.path}
            className="bg-gray-800 hover:bg-blue-600 transition rounded-2xl p-6 shadow-lg flex flex-col items-start"
          >
            <h2 className="text-2xl font-semibold mb-2">{ups.name}</h2>
            <p className="text-gray-400">{ups.description}</p>
          </Link>
        ))}
      </div>

      <footer className="mt-16 text-gray-500 text-sm">
        © {new Date().getFullYear()} UPS Sizing Pro — All Rights Reserved.
      </footer>
    </main>
  );
}
