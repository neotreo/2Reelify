"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";
import { 
  Home, 
  Video, 
  Plus, 
  Library, 
  Settings, 
  LogOut,
  Menu,
  X,
  Sparkles,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      label: "Create",
      href: "/dashboard/create",
      icon: Plus,
      highlight: true,
    },
    {
      label: "My Videos",
      href: "/dashboard/videos",
      icon: Library,
    },
    {
      label: "Pricing",
      href: "/pricing",
      icon: CreditCard,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Reelify</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className={cn(
                    "gap-2",
                    item.highlight && !isActive(item.href) && 
                    "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.highlight && (
                    <Sparkles className="w-3 h-3" />
                  )}
                </Button>
              </Link>
            ))}
            
            <div className="ml-4 pl-4 border-l">
              <form action={signOutAction}>
                <Button variant="ghost" type="submit" className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive(item.href)
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-gray-100",
                      item.highlight && !isActive(item.href) && 
                      "text-purple-600"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.highlight && (
                      <Sparkles className="w-4 h-4 ml-auto" />
                    )}
                  </div>
                </Link>
              ))}
              
              <div className="pt-4 mt-4 border-t">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors w-full text-left text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
