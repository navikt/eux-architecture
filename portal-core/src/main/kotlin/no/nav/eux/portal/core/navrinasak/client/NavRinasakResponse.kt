package no.nav.eux.portal.core.navrinasak.client

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

/**
 * DTOs mirroring the subset of eux-nav-rinasak's `NavRinasakSearchResponseType`
 * (GET /api/v1/rinasaker/nyeste) that the portal needs. Unknown fields are
 * ignored so the contract stays loose.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class NavRinasakerResponse(
    val navRinasaker: List<NavRinasakDto> = emptyList(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class NavRinasakDto(
    val rinasakId: Int,
    val overstyrtEnhetsnummer: String? = null,
    val opprettetBruker: String? = null,
    val opprettetTidspunkt: String? = null,
    val fagsak: FagsakDto? = null,
    val initiellFagsak: InitiellFagsakDto? = null,
    val dokumenter: List<DokumentDto>? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class DokumentDto(
    val sedId: String,
    val sedVersjon: Int,
    val sedType: String,
    val dokumentInfoId: String? = null,
    val opprettetBruker: String? = null,
    val opprettetTidspunkt: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class FagsakDto(
    val tema: String? = null,
    val type: String? = null,
    val system: String? = null,
    val nr: String? = null,
    val fnr: String? = null,
    val opprettetTidspunkt: String? = null,
    val endretTidspunkt: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class InitiellFagsakDto(
    val id: String? = null,
    val tema: String? = null,
    val type: String? = null,
    val system: String? = null,
    val nr: String? = null,
    val arkiv: String? = null,
    val fnr: String? = null,
    val opprettetTidspunkt: String? = null,
)
