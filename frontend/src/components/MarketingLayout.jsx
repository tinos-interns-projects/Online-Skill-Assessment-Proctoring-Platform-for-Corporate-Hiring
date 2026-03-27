import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#eff6ff_35%,#ffffff_75%)]">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default MarketingLayout;
