"use client";

import { useEffect, useState } from "react";

/**
 * The OAuth popup lands here after the backend callback redirect.
 * It notifies the opener window that the connect step finished, then closes.
 * If there is no opener (popup blocked / opened in same tab), it falls back to
 * redirecting the whole tab back to /integrations.
 */
export default function OAuthBridgePage() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider") ?? "";
    const status = params.get("status") ?? "select";

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        { type: "oauth-complete", provider, status },
        window.location.origin
      );
      window.close();
      // If the browser refuses to close the popup, show a manual close hint.
      setTimeout(() => setStuck(true), 600);
    } else {
      window.location.replace(`/integrations?provider=${provider}&phase=select`);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        color: "var(--fg-muted)",
        fontSize: 14,
        textAlign: "center",
        padding: 24,
      }}
    >
      {stuck
        ? "All set — you can close this window and return to LeadMax."
        : "Finishing up…"}
    </div>
  );
}
