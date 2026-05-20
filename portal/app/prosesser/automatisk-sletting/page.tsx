import { Heading, BodyLong, VStack, GuidePanel } from "@navikt/ds-react";

export const metadata = {
  title: "Automatisk sletting · Team EESSI Nav",
};

export default function Page() {
  return (
    <VStack gap="space-24">
      <div>
        <div
          style={{
            color: "var(--ax-text-subtle, #555)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: 12,
          }}
        >
          Prosess
        </div>
        <Heading size="xlarge" level="1">
          Automatisk sletting
        </Heading>
      </div>
      <GuidePanel poster>
        <Heading spacing size="small" level="2">
          Under arbeid
        </Heading>
        <BodyLong>
          Denne siden vil beskrive hvordan plattformen rydder bort RINA-saker
          som aldri ble brukt — typisk saker uten SED-er, opprettet ved feil
          eller forlatt i utkastfase. Kommer snart.
        </BodyLong>
      </GuidePanel>
    </VStack>
  );
}
