"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import {
  HomeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "首页", href: "/", icon: HomeIcon },
  { name: "教案生成", href: "/lesson-plan", icon: DocumentTextIcon },
  { name: "练习题", href: "/exercises", icon: AcademicCapIcon },
  { name: "设置", href: "/settings", icon: Cog6ToothIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <SparklesIcon className="w-8 h-8 text-apple-blue" />
            <span className="text-gradient">TeachAI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="hidden md:flex nav-link text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="退出登录"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="hidden lg:inline">退出</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="px-4 py-2">
          <div className="flex justify-around">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "text-apple-blue bg-apple-blue/10"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
