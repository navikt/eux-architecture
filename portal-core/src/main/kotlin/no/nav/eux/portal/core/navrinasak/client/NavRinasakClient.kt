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

    private fun NavRinasakDto.toSeds(): List<NavRinasakSed> =
        (dokumenter ?: emptyList()).map { dokument ->
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
                fagsak = fagsak?.let {
                    FagsakInfo(
                        tema = it.tema,
                        type = it.type,
                        system = it.system,
                        nr = it.nr,
                        fnr = it.fnr,
                        opprettetTidspunkt = it.opprettetTidspunkt,
                        endretTidspunkt = it.endretTidspunkt,
                    )
                },
                initiellFagsak = initiellFagsak?.let {
                    InitiellFagsakInfo(
                        id = it.id,
                        tema = it.tema,
                        type = it.type,
                        system = it.system,
                        nr = it.nr,
                        arkiv = it.arkiv,
                        fnr = it.fnr,
                        opprettetTidspunkt = it.opprettetTidspunkt,
                    )
                },
            )
        }
}
