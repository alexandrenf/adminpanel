import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";

export default async function Home() {
  const session = await getServerAuthSession();

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">

      <div className="flex-grow flex items-center justify-center">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-12 space-y-8 md:space-y-0">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-5xl font-extrabold mb-4">IFMSA Brazil Admin Portal</h1>
            <p className="text-lg">
              You can only sign in with an @ifmsabrazil.org Google account.
            </p>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="flex flex-col items-center md:items-end space-y-4">
              {session && (
                <p className="text-2xl">
                  Logged in as <span className="font-semibold">{session.user?.name}</span>
                </p>
              )}
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="inline-block px-6 py-3 text-lg font-semibold text-blue-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition"
              >
                {session ? "Sign out" : "Sign in with Google"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
