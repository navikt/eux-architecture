import type { Metadata } from "next";
import { Avhengigheter } from "@/components/avhengigheter/Avhengigheter";

export const metadata: Metadata = {
  title: "Avhengigheter · Team EESSI Nav",
  description:
    "Hvordan vi velger avhengigheter og holder dem oppdatert i eux-appene – Spring Boot, eux-parent-pom, rene POM-er, Dependabot og sårbarheter i NAIS Console.",
};

export default function Page() {
  return <Avhengigheter />;
}
