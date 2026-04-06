import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

interface NavLinkCompatProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  activeClassName?: string;
  to?: string; // Tương thích với code cũ dùng react-router-dom
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, href, to, ...props }, ref) => {
    const pathname = usePathname();
    
    // Hỗ trợ cả href của Next.js và to của react-router-dom
    const dest = href || to || "#";
    const isActive = pathname === dest || pathname?.startsWith(dest + '/');

    // Nối các chuỗi class lại với nhau thay vì dùng hàm cn (Tailwind merge)
    const combinedClassName = [className, isActive ? activeClassName : ""].filter(Boolean).join(" ");

    return (
      <Link
        ref={ref}
        href={dest}
        className={combinedClassName}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
