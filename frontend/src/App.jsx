import React from "react";
import BypassPanel from "./BypassPanel.jsx";
import PixelCharacter from "./PixelCharacter.jsx";

export default function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-name">UNLINK</span>
        </div>
      </nav>

      <header className="hero">
        <h1 className="hero-title">
          Bypass <span className="grad">shortlink</span>
        </h1>
      </header>

      <PixelCharacter />

      <main>
        <BypassPanel />
      </main>

      <footer>
        <p className="credit">unlink</p>
      </footer>
    </div>
  );
}