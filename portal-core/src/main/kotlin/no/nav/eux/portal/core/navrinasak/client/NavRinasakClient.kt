package no.nav.eux.portal.core.navrinasak.client

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.navrinasak.config.NavRinasakProperties.EnvConfig
import no.nav.eux.portal.core.navrinasak.model.FagsakInfo
import no.nav.eux.portal.core.navrinasak.model.InitiellFagsakInfo
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSed
import org.springframework.http.HttpHeaders.AUTHORIZATION
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * REST client for eux-nav-rinasak's `GET /api/v1/rinasaker/nyeste`. Returns the
 * most recently created SEDs, flattened one row per dokument with the parent
 * nav-rinasak / fagsak context attached.
 */
@Component
class NavRinasakClient(
    private val tokenClient: AzureAdTokenClient,
) {

    private val log = logger {}
    private val restClient = RestClient.create()

    fun fetchNyeste(environment: String, config: EnvConfig, antall: Int): List<NavRinasakSed> {
        val token = tokenClient.getToken(config.scope)
        val response = restClient.get()
            .uri("${config.baseUrl.trimEnd('/')}/api/v1/rinasaker/nyeste?antall=$antall")
            .header(AUTHORIZATION, "Bearer $token")
            .retrieve()
            .body(NavRinasakerResponse::class.java)
            ?: NavRinasakerResponse()
        log.debug { "Hentet ${response.navRinasaker.size} nav-rinasaker fra $environment" }
        return response.navRinasaker.flatMap { it.toSeds() }
    }

    /**
     * Flattens a nav-rinasak into one row per dokument (journalført SED). A case
     * with no dokumenter yet — the normal state for a SED just created in nEESSI,
     * since the dokument is only recorded once the SED is journalført — produces a
     * single **placeholder** row (null SED fields) so the freshly-created case is
     * still visible. Once a dokument arrives, the poller replaces the placeholder
     * with the real SED row.
     */
    private fun NavRinasakDto.toSeds(): List<NavRinasakSed> {
        val dokumenter = dokumenter ?: emptyList()
        if (dokumenter.isEmpty()) return listOf(toPlaceholderSed())
        return dokumenter.map { toSed(it) }
    }

    private fun NavRinasakDto.toPlaceholderSed(): NavRinasakSed =
        NavRinasakSed(
            rinasakId = rinasakId,
            overstyrtEnhetsnummer = overstyrtEnhetsnummer,
            sedId = null,
            sedVersjon = null,
            sedType = null,
            dokumentInfoId = null,
            opprettetBruker = null,
            opprettetTidspunkt = null,
            navRinasakOpprettetBruker = opprettetBruker,
            navRinasakOpprettetTidspunkt = opprettetTidspunkt,
            fagsak = fagsak?.toInfo(),
            initiellFagsak = initiellFagsak?.toInfo(),
        )

    private fun NavRinasakDto.toSed(dokument: DokumentDto): NavRinasakSed =
        NavRinasakSed(
            rinasakId = rinasakId,
            overstyrtEnhetsnummer = overstyrtEnhetsnummer,
            sedId = dokument.sedId,
            sedVersjon = dokument.sedVersjon,
            sedType = dokument.sedType,
            dokumentInfoId = dokument.dokumentInfoId,
            opprettetBruker = dokument.opprettetBruker,
            opprettetTidspunkt = dokument.opprettetTidspunkt,
            navRinasakOpprettetBruker = opprettetBruker,
            navRinasakOpprettetTidspunkt = opprettetTidspunkt,
            fagsak = fagsak?.toInfo(),
            initiellFagsak = initiellFagsak?.toInfo(),
        )

    private fun FagsakDto.toInfo() =
        FagsakInfo(
            tema = tema,
            type = type,
            system = system,
            nr = nr,
            fnr = fnr,
            opprettetTidspunkt = opprettetTidspunkt,
            endretTidspunkt = endretTidspunkt,
        )

    private fun InitiellFagsakDto.toInfo() =
        InitiellFagsakInfo(
            id = id,
            tema = tema,
            type = type,
            system = system,
            nr = nr,
            arkiv = arkiv,
            fnr = fnr,
            opprettetTidspunkt = opprettetTidspunkt,
        )
}
