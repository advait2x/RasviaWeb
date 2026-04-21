import { useEffect } from "react";

/** @deprecated Route removed — redirects into partner portal Settings (Partner tab). */
export default function PartnerProfilePage() {
  useEffect(() => {
    try {
      sessionStorage.setItem("rasvia:open_settings_panel", "partner");
    } catch {
      /* ignore */
    }
    window.location.replace("/partner-portal");
  }, []);
  return null;
}
