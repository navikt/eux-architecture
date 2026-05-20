import TestsClient from "./TestsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smoke-test · Team EESSI Nav",
  description:
    "Kjør en ekte ende-til-ende smoke-test mot eux-rina-gateway i Q1 eller Q2 fra nettleseren: opprett en RINA-sak, legg ved en H001 SED, verifiser, oppdater og rydd opp. Hvert steg vises med fullstendig request og response.",
};

export default function Page() {
  return <TestsClient />;
}
