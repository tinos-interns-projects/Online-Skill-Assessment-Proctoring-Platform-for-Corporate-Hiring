import { Link } from "react-router-dom";

const footerLinks = [
  { label: "About", to: "/resources/docs" },
  { label: "Contact", to: "/#contact" },
  { label: "Support", to: "/resources/docs" },
  { label: "Privacy Policy", to: "/resources/docs" },
  { label: "Terms", to: "/resources/docs" }
];

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-semibold text-slate-700">SkillAssess</p>
        <div className="flex flex-wrap gap-5">
          {footerLinks.map((link) => (
            <Link key={link.label} to={link.to} className="transition hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
