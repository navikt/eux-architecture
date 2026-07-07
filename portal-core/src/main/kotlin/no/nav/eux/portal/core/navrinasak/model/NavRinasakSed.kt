package no.nav.eux.portal.core.navrinasak.model

import java.time.Instant

/**
 * A single SED (dokument) that has been created in nEESSI and therefore has a
 * record in eux-nav-rinasak. This is the flattened, per-SED view the portal
 * renders: each dokument on a nav-rinasak becomes one row, carrying its parent
 * case/fagsak context.
 *
 * A nav-rinasak (RINA case) is registered in eux-nav-rinasak before its SED
 * (dokument) is necessarily recorded — the dokument is added later via a
 * separate call. To make such freshly-created cases visible immediately (the
 * whole point of this monitor is "created, not yet sent"), a case with no
 * dokument yet is represented by a single **placeholder** row where the SED
 * fields ([sedId], [sedVersjon], [sedType]) are `null`. Once a dokument arrives
 * the placeholder is replaced by the real SED row (see the poller/store).
 */
data class NavRinasakSed(
    val rinasakId: Int,
    val overstyrtEnhetsnummer: String?,
    val sedId: String?,
    val sedVersjon: Int?,
    val sedType: String?,
    val dokumentInfoId: String?,
    val opprettetBruker: String?,
    val opprettetTidspunkt: String?,
    val navRinasakOpprettetBruker: String?,
    val navRinasakOpprettetTidspunkt: String?,
    val fagsak: FagsakInfo?,
    val initiellFagsak: InitiellFagsakInfo?,
    val bucType: String? = null,
) {
    /** True when this row is a case placeholder with no dokument recorded yet. */
    val isPlaceholder: Boolean get() = sedId == null
}

data class FagsakInfo(
    val tema: String?,
    val type: String?,
    val system: String?,
    val nr: String?,
    val fnr: String?,
    val opprettetTidspunkt: String?,
    val endretTidspunkt: String?,
)

data class InitiellFagsakInfo(
    val id: String?,
    val tema: String?,
    val type: String?,
    val system: String?,
    val nr: String?,
    val arkiv: String?,
    val fnr: String?,
    val opprettetTidspunkt: String?,
)

enum class SentStatus {
    SENDT,
    IKKE_SENDT,
    UKJENT,
}

/**
 * Wrapper stored in [no.nav.eux.portal.core.navrinasak.store.NavRinasakSedStore]
 * and broadcast to the portal over SSE.
 *
 * [receivedAt] is when portal-core first observed the SED. For SEDs seeded on the
 * first poll it is set to the SED's creation time (so the UI does not "flash" the
 * whole backlog); for SEDs discovered on later polls it is the observation time.
 *
 * [sentStatus] is mutable so the sedsendt-correlation can flip a row from
 * IKKE_SENDT to SENDT live without rebuilding the store. [sed] is mutable so a
 * case placeholder can be enriched in place with the SED type learned from the
 * RINA document-events stream before the SED is journalført.
 */
data class NavRinasakSedRecord(
    @Volatile var sed: NavRinasakSed,
    val environment: String,
    val receivedAt: Instant,
    @Volatile var sentStatus: SentStatus,
)
