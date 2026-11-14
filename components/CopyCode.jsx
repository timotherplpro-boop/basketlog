"use client";
// Bloc de code à copier en un clic (code d'intégration du widget).
import { useState } from "react";

export default function CopyCode({ code, label, done }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {}
  };
  return (
    <div className="copy-code">
      <pre><code>{code}</code></pre>
      <button type="button" onClick={copy}>{ok ? done : label}</button>
    </div>
  );
}
