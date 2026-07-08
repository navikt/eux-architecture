package no.nav.eux.portal.core.navrinasak.correlation

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.navrinasak.model.SentStatus
import no.nav.eux.portal.core.navrinasak.sse.NavRinasakSseRegistry
import no.nav.eux.portal.core.navrinasak.store.NavRinasakSedStore
import no.nav.eux.portal.core.navrinasak.store.SentSedIndex
import org.springframework.stereotype.Component

/**
 * Correlates the `sedsendt` Kafka events (already consumed by the Kafka feature)
 * with the SEDs created in nEESSI, so a row can flip from "Ikke sendt" to
 * "Sendt" live.
 *
 * On each sendt-event we (1) record the sent keys in [SentSedIndex] so future
 * polls classify correctly, and (2) flip any already-displayed matching rows in
 * [NavRinasakSedStore] and re-broadcast them so open pages update in place.
 */
@Component
class NavRinasakSentCorrelator(
    private val sentSedIndex: SentSedIndex,
    private val store: NavRinasakSedStore,
    private val sseRegistry: NavRinasakSseRegistry,
) {

    private val log = logger {}

    /** Candidate sedIds from the Kafka event that may match nav-rinasak's dokument.sedId. */
    private fun SedHendelse.candidateSedIds() = listOf(sedId, rinaDokumentId)

    fun onSedSendt(environment: String, hendelse: SedHendelse, broadcast: Boolean = true) {
        sentSedIndex.markSent(environment, hendelse.rinaSakId, hendelse.candidateSedIds(), hendelse.sedType)
        if (!broadcast) return
        val flipped = store.getAll().filter { record ->
            record.environment == environment &&
                record.sentStatus != SentStatus.SENDT &&
                sentSedIndex.isSent(environment, record.sed.rinasakId, record.sed.sedId, record.sed.sedType)
        }
        flipped.forEach { record ->
            record.sentStatus = SentStatus.SENDT
            sseRegistry.broadcast("nav-rinasak-sed-status", record)
        }
        if (flipped.isNotEmpty()) {
            log.debug { "Flippet ${flipped.size} SED-er til SENDT i $environment (rinaSakId=${hendelse.rinaSakId})" }
        }
    }
}
