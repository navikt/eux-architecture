package no.nav.eux.portal.core.navrinasak.model

import java.time.Instant

/**
 * A single SED (dokument) that has been created in nEESSI and therefore has a
 * record in eux-nav-rinasak. This is the flattened, per-SED view the portal
 * renders: each dokument on a nav-rinasak becomes one row, carrying its parent
 * case/fagsak context.
 */
data class NavRinasakSed(
    val rinasakId: Int,
    val overstyrtEnhetsnummer: String?,
    val sedId: String,
    val sedVersjon: Int,
    val sedType: String,
    val dokumentInfoId: String?,
    val opprettetBruker: String?,
    val opprettetTidspunkt: String?,
    val navRinasakOpprettetBruker: String?,
    val navRinasakOpprettetTidspunkt: String?,
    val fagsak: FagsakInfo?,
    val initiellFagsak: InitiellFagsakInfo?,
)

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
 * IKKE_SENDT to SENDT live without rebuilding the store.
 */
data class NavRinasakSedRecord(
    val sed: NavRinasakSed,
    val environment: String,
    val receivedAt: Instant,
    @Volatile var sentStatus: SentStatus,
)
