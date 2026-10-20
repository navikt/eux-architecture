/** SedHendelse as published on sedsendt-v1 / sedmottatt-v1. */
export interface SedHendelse {
  id?: string;
  sedId?: string;
  sektorKode?: string;
  bucType?: string;
  rinaSakId?: string;
  avsenderId?: string;
  avsenderNavn?: string;
  avsenderLand?: string;
  mottakerId?: string;
  mottakerNavn?: string;
  mottakerLand?: string;
  rinaDokumentId?: string;
  rinaDokumentVersjon?: string;
  sedType?: string;
  navBruker?: string;
}

/** A SedHendelse with the Kafka metadata added by eux-portal-core. */
export interface SedHendelseRecord {
  hendelse: SedHendelse;
  topic: string;
  environment: string;
  direction: string;
  receivedAt: string;
  offset: number;
  partition: number;
}

/** Same cap as SedHendelseStore in eux-portal-core. */
export const SED_HENDELSE_MAX_ROWS = 500;

export const SED_HENDELSE_SNAPSHOT_URL = "/api/kafka/sed-hendelser";
export const SED_HENDELSE_STREAM_URL = "/api/kafka/sed-hendelser/stream";

/** Unique per Kafka message. */
export const recordKey = (r: SedHendelseRecord) => `${r.topic}|${r.partition}|${r.offset}`;
