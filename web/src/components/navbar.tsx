"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import {
  HomeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";

// Navigation items for authenticated users
const protectedNavigation = [
  { name: "教案生成", href: "/lesson-plan", icon: DocumentTextIcon },
  { name: "练习题", href: "/exercises", icon: AcademicCapIcon },
  { name: "我的内容", href: "/my-content", icon: BookmarkIcon },
  { name: "设置", href: "/settings", icon: Cog6ToothIcon },
];

// Navigation items for public users
const publicNavigation = [{ name: "首页", href: "/", icon: HomeIcon }];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const navigation = isLoggedIn ? protectedNavigation : publicNavigation;

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
              const isExercises = item.href === "/exercises";

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${
                    isActive 
                      ? isExercises 
                        ? "text-apple-green bg-apple-green/10" 
                        : "nav-link-active"
                      : isExercises 
                        ? "hover:text-apple-green" 
                        : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            ) : isLoggedIn ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {session?.user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="nav-link text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="退出登录"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="hidden lg:inline">退出</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex nav-link text-apple-blue hover:text-apple-blue/80"
                title="邀请码登录"
              >
                <UserIcon className="w-5 h-5" />
                <span className="hidden lg:inline">登录</span>
              </Link>
            )}
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
              const isExercises = item.href === "/exercises";

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? isExercises
                        ? "text-apple-green bg-apple-green/10"
                        : "text-apple-blue bg-apple-blue/10"
                      : isExercises
                        ? "text-gray-600 dark:text-gray-400 hover:text-apple-green dark:hover:text-apple-green"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Mobile Login/Logout */}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                退出
              </button>
            ) : (
              <Link
                href="/login"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  pathname === "/login"
                    ? "text-apple-blue bg-apple-blue/10"
                    : "text-apple-blue hover:text-apple-blue/80"
                }`}
              >
                <UserIcon className="w-5 h-5" />
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}