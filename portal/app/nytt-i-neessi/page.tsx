import type { Metadata } from "next";
import { NyttINeessi } from "@/components/nytt-i-neessi/NyttINeessi";

// Skjult side: bare tilgjengelig via direkte lenke, ikke i Sidebar.
export const metadata: Metadata = {
  title: "Nytt i nEESSI · Team EESSI Nav",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <NyttINeessi />;
}
