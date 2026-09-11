"use client";
import { useState } from "react";
import { hexpertify } from "@/asset/images";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("hexpertify")
    ) {
      return "https://hexpertify-backend.vercel.app";
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
};

const Header = () => {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const backendUrl = getBackendUrl();

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
    setIsMobileMenuOpen(false);
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="relative flex justify-between items-center py-2 px-4 pl-0 md:py-[16px] md:px-[30px] md:pl-0 bg-white shadow-[0_4px_4px_3px_rgba(0,0,0,0.25)] z-50">
      {/* Logo */}
      <Link
        href="/"
        className="cursor-pointer"
        aria-label="Go to Hexpertify home page"
      >
        <object
          type="image/svg+xml"
          data={hexpertify}
          width={300}
          height={60}
          role="img"
          aria-label="Hexpertify logo"
          className="pointer-events-none h-[40px] md:h-[60px] w-auto object-contain transform-none!"
        >
          svg-animation
        </object>
      </Link>

      {/* --- DESKTOP MENU (Hidden on Mobile) --- */}
      <section className="hidden md:flex justify-center items-center gap-[30px]">
        <ul className="flex menuText gap-[40px] cursor-pointer items-center">
          <li>
            <Link href="/">Home</Link>
          </li>
          {session?.user && (
            <>
              <li>
                <Link href="/profile">My Profile</Link>
              </li>
              <li>
                <a href={`${backendUrl}/client`} className="text-purple-600 font-semibold hover:text-purple-800 transition-colors">
                  Client Portal
                </a>
              </li>
            </>
          )}
          <li>
            <Link href="/blogs">Blogs</Link>
          </li>
          <li>
            <Link href="/services">Services</Link>
          </li>
          <li>
            <Link href="/about-us">About Us</Link>
          </li>
          <li>
            <Link href="/contact-us">Contact Us</Link>
          </li>
        </ul>

        <div className="flex gap-[10px]">
          {!session?.user ? (
            <>
              <a href={`${backendUrl}/login`}>
                <Button
                  variant="default"
                  className="text-[16px] text-[#fff] cursor-pointer"
                >
                  Login
                </Button>
              </a>
              <a href={`${backendUrl}/login?mode=signup`}>
                <Button
                  variant="outline"
                  className="text-[16px] text-[#450bc8] cursor-pointer"
                >
                  Signup
                </Button>
              </a>
            </>
          ) : (
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-[16px] text-red-600 border-red-600 hover:text-red-600 cursor-pointer"
            >
              Logout
            </Button>
          )}
        </div>
      </section>

      {/* --- MOBILE HAMBURGER BUTTON --- */}
      <div className="md:hidden flex items-center z-50">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-controls="mobile-navigation-menu"
          aria-expanded={isMobileMenuOpen}
          className="text-gray-700 focus:outline-none"
        >
          {/* DENSE VIEW CHANGE: Slightly smaller icon size (w-6 h-6) */}
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* --- MOBILE DRAWER CONTAINER --- */}
      {/* Overlay Backdrop - Fades in/out */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={closeMenu}
      ></div>

      {/* The Drawer - Slides in from right */}
      <div
        id="mobile-navigation-menu"
        className={`fixed top-0 right-0 h-full w-[75%] sm:w-[60%] bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col p-6 h-full overflow-y-auto">
          {/* Close Button */}
          <div className="flex justify-end mb-8">
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className="text-gray-700 hover:text-red-500 transition-colors"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Links */}
          <ul className="flex flex-col gap-6 text-lg font-medium text-gray-800">
            <li onClick={closeMenu}>
              <Link href="/" className="hover:text-[#450bc8] transition-colors">
                Home
              </Link>
            </li>

            {session?.user && (
              <>
                <li onClick={closeMenu}>
                  <Link
                    href="/profile"
                    className="hover:text-[#450bc8] transition-colors"
                  >
                    My Profile
                  </Link>
                </li>
                <li onClick={closeMenu}>
                  <a
                    href={`${backendUrl}/client`}
                    className="text-[#450bc8] font-semibold hover:underline transition-colors"
                  >
                    Client Portal
                  </a>
                </li>
              </>
            )}

            <li onClick={closeMenu}>
              <Link
                href="/blogs"
                className="hover:text-[#450bc8] transition-colors"
              >
                Blogs
              </Link>
            </li>
            <li onClick={closeMenu}>
              <Link
                href="/services"
                className="hover:text-[#450bc8] transition-colors"
              >
                Services
              </Link>
            </li>
            <li onClick={closeMenu}>
              <Link
                href="/about-us"
                className="hover:text-[#450bc8] transition-colors"
              >
                About Us
              </Link>
            </li>
            <li onClick={closeMenu}>
              <Link
                href="/contact-us"
                className="hover:text-[#450bc8] transition-colors"
              >
                Contact Us
              </Link>
            </li>
          </ul>

          {/* Buttons */}
          <div className="mt-8 flex flex-col gap-4">
            {!session?.user ? (
              <>
                <a href={`${backendUrl}/login`} onClick={closeMenu} className="w-full">
                  <Button
                    variant="default"
                    className="w-full text-[16px] text-[#fff] cursor-pointer"
                  >
                    Login
                  </Button>
                </a>
                <a href={`${backendUrl}/login?mode=signup`} onClick={closeMenu} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full text-[16px] text-[#450bc8] cursor-pointer"
                  >
                    Signup
                  </Button>
                </a>
              </>
            ) : (
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full text-[16px] text-red-600 border-red-600 cursor-pointer"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
