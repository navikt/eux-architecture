import type { Metadata } from "next";
import { NyITeamet } from "@/components/ny-i-teamet/NyITeamet";

export const metadata: Metadata = {
  title: "Ny i teamet · Team EESSI Nav",
  description: "Velkommen til Team EESSI Nav – teamet, EESSI, RINA, NAIS, Slack, møtene og verktøyene våre.",
};

export default function Page() {
  return <NyITeamet />;
}
