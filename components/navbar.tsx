import Link from "next/link";

const Navbar = () => {
  const links = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/sign-in", label: "Sign In" },
    { href: "/sign-up", label: "Sign Up" },
    { href: "/sign-out", label: "Sign Out" },
  ];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Better Auth Demo
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
