import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "listen", end: true },
  { to: "/method", label: "method" },
  { to: "/docs/limitations", label: "limitations" },
];

export function NavBar() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <span className="nav-brand" aria-label="pitman">
          pitman
        </span>
        <nav aria-label="Primary">
          <ul className="nav-links">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
