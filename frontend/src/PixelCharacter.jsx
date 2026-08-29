import React, { useState } from "react";

// Karakter pixel chibi/kawaii (gaya hoodie-onesie: kepala besar menyatu badan,
// lengan+kaki nubs, outline hitam tebal, dot eyes, patch dada) dengan animasi idle.
// Dibuat murni dari div + CSS (bukan gambar), selalu tajam & konsisten.
export default function PixelCharacter() {
  const [boop, setBoop] = useState(false);

  const handleClick = () => {
    setBoop(true);
    setTimeout(() => setBoop(false), 550);
  };

  return (
    <div
      className={`chibi ${boop ? "boop" : ""}`}
      onClick={handleClick}
      title="klik aku!"
    >
      {/* telinga (identitas hewan) */}
      <span className="ch-ears">
        <i className="ch-ear ch-ear-l" />
        <i className="ch-ear ch-ear-r" />
      </span>

      {/* badan-hoodie (kapsul: kepala+badan menyatu) */}
      <div className="ch-body">
        {/* wajah: mata + mulut */}
        <div className="ch-face">
          <b className="eye l" />
          <b className="eye r" />
          <i className="mouth" />
        </div>
        {/* patch dada (logo area) */}
        <div className="ch-bib" />
      </div>

      {/* lengan nubs */}
      <span className="ch-arm ch-arm-l" />
      <span className="ch-arm ch-arm-r" />

      {/* kaki nubs */}
      <span className="ch-foot ch-foot-l" />
      <span className="ch-foot ch-foot-r" />

      {/* bayangan */}
      <span className="ch-shadow" />
    </div>
  );
}