import TestsClient from "./TestsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smoke-test · Team EESSI Nav",
  description:
    "Kjør en ekte ende-til-ende smoke-test mot eux-rina-api i Q1 eller Q2 fra nettleseren: opprett en RINA-sak, legg ved en H001 SED, verifiser, oppdater, verifiser igjen og send SED-en. Hvert steg vises med fullstendig request og response.",
};

export default function Page() {
  return <TestsClient />;
}
