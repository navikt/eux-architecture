import { Heading, BodyLong, VStack, GuidePanel } from "@navikt/ds-react";

export const metadata = {
  title: "Journalføring · Team EESSI Nav",
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
          Journalføring
        </Heading>
      </div>
      <GuidePanel poster>
        <Heading spacing size="small" level="2">
          Under arbeid
        </Heading>
        <BodyLong>
          Denne siden vil forklare hvordan SED-er journalføres mot Dokarkiv,
          rollen til eux-fagmodul-journalfoeroing og eux-journal, og hvordan
          journalposter ferdigstilles eller feilregistreres. Kommer snart.
        </BodyLong>
      </GuidePanel>
    </VStack>
  );
}
