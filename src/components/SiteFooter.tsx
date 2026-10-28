import { t } from "../lib/i18n/t";
import { useLocale } from "./i18n/useLocale";

/** The page's footer: the credit Open-Meteo's CC BY 4.0 terms ask for. */
export function SiteFooter({ className }: { className?: string }) {
  const locale = useLocale();
  const credit = t(locale, "weatherCredit");
  return (
    <footer className={`px-4 pt-10 text-[12.5px] text-muted sm:px-6 ${className ?? ""}`}>
      {credit.before}{" "}
      <a href="https://open-meteo.com/" className="font-medium text-accent underline">
        {credit.link}
      </a>
    </footer>
  );
}
