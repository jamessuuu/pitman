import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { ListenPage } from "./pages/Listen";
import { ReferenceCardsPage } from "./pages/ReferenceCards";
import { MethodPage } from "./pages/Method";
import { LimitationsPage } from "./pages/Limitations";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <NavBar />
      <main id="main">
        <Routes>
          <Route path="/" element={<ListenPage />} />
          <Route path="/reference" element={<ReferenceCardsPage />} />
          <Route path="/method" element={<MethodPage />} />
          <Route path="/docs/limitations" element={<LimitationsPage />} />
        </Routes>
      </main>
    </>
  );
}
