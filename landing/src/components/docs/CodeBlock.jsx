import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";

export default function CodeBlock({ code, language = "bash" }) {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-[#0f172a] shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-900/70 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{language}</span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80"
          aria-live="polite"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>Copied ✔</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="m-0 overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code ref={codeRef} className={`language-${language}`}>
          {code.trim()}
        </code>
      </pre>
    </div>
  );
}
