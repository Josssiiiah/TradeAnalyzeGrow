import { NavLink } from "@remix-run/react";

export function TopNavbar() {
  return (
    <nav className="p-4 border-b border-gray-300 flex justify-between items-center">
      <ul className="flex space-x-10">
        <h1>
          <NavLink to="/" className="text-2xl font-bold">
            Trade Journal
          </NavLink>
        </h1>
        <li>
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/app/tradelog"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Trade Log
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/app/recap"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Recap
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/app/journal"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Journals
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/app/seed"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Seed
          </NavLink>
        </li>
      </ul>
      <ul>
        <li>
          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `block px-4 py-2 text-black hover:bg-gray-500 rounded-lg ${
                isActive ? "bg-gray-500" : ""
              }`
            }
          >
            Profile
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
