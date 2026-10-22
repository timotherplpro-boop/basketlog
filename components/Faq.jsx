"use client";
import { useState } from "react";

export default function Faq({ items }) {
  const [open, setOpen] = useState(items.length - 1);
  return (
    <div className="faq-list">
      {items.map((it, i) => (
        <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
          <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
            <span className="plus" aria-hidden />
            {it.q}
          </button>
          <div className="faq-a"><div><p>{it.a}</p></div></div>
        </div>
      ))}
    </div>
  );
}
