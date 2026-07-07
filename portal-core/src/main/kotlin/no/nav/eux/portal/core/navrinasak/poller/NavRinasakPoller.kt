package no.nav.eux.portal.core.navrinasak.poller

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.navrinasak.client.NavRinasakClient
import no.nav.eux.portal.core.navrinasak.config.NavRinasakProperties
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSed
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import no.nav.eux.portal.core.navrinasak.model.SentStatus
import no.nav.eux.portal.core.navrinasak.rina.RinaDocumentInfoIndex
import no.nav.eux.portal.core.navrinasak.sse.NavRinasakSseRegistry
import no.nav.eux.portal.core.navrinasak.store.NavRinasakSedStore
import no.nav.eux.portal.core.navrinasak.store.SentSedIndex
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.OffsetDateTime
import java.util.concurrent.ConcurrentHashMap

/**
 * Polls eux-nav-rinasak (per environment) for the most recently created SEDs and
 * feeds them into [NavRinasakSedStore], broadcasting genuinely-new SEDs over SSE.
 *
 * The very first poll of an environment seeds the store *silently* (records get
 * [NavRinasakSedRecord.receivedAt] = the SED's creation time and are not
 * broadcast) so an open page does not flash the whole backlog. Subsequent polls
 * broadcast newly-created SEDs with `receivedAt = now`, which the page renders
 * with the "new row" flash.
 */
@Component
@ConditionalOnProperty(name = ["portal.navrinasak.enabled"], havingValue = "true")
class NavRinasakPoller(
    private val properties: NavRinasakProperties,
    private val client: NavRinasakClient,
    private val store: NavRinasakSedStore,
    private val sentSedIndex: SentSedIndex,
    private val sseRegistry: NavRinasakSseRegistry,
    private val documentInfoIndex: RinaDocumentInfoIndex,
) {

    private val log = logger {}
    private val initialized = ConcurrentHashMap.newKeySet<String>()

    @Scheduled(
        fixedDelayString = "\${portal.navrinasak.poll-interval-ms:5000}",
        initialDelayString = "\${portal.navrinasak.initial-delay-ms:5000}",
    )
    fun poll() {
        properties.activeEnvironments().forEach { (environment, config) ->
            runCatching { pollEnvironment(environment, config) }
                .onFailure { log.warn(it) { "Polling av nav-rinasak feilet for $environment" } }
        }
    }

    private fun pollEnvironment(environment: String, config: NavRinasakProperties.EnvConfig) {
        val seds = client.fetchNyeste(environment, config, properties.antall)
        val isInitial = initialized.add(environment)
        var added = 0
        seds.reversed().forEach { sed ->
            val enrichedSed = enrichFromDocumentEvents(environment, sed)
            val sentStatus = sentStatusFor(environment, enrichedSed)
            val receivedAt = if (isInitial) creationInstant(enrichedSed) else Instant.now()
            val record = NavRinasakSedRecord(
                sed = enrichedSed,
                environment = environment,
                receivedAt = receivedAt,
                sentStatus = sentStatus,
            )
            if (store.addIfNew(record)) {
                added++
                if (!isInitial) sseRegistry.broadcast("nav-rinasak-sed", record)
                // A real SED (journalført dokument) supersedes the case placeholder.
                if (!enrichedSed.isPlaceholder && store.removePlaceholderFor(environment, sed.rinasakId) && !isInitial) {
                    sseRegistry.broadcast(
                        "nav-rinasak-sed-removed",
                        mapOf("environment" to environment, "rinasakId" to sed.rinasakId),
                    )
                }
            } else if (sed.isPlaceholder) {
                // Placeholder already stored — enrich it if the SED type has since
                // been learned from the RINA document-events stream.
                enrichStoredPlaceholder(environment, sed.rinasakId, broadcast = !isInitial)
            }
        }
        if (isInitial) {
            log.info { "nav-rinasak $environment: seedet $added SED-er (stille)" }
        } else if (added > 0) {
            log.info { "nav-rinasak $environment: $added nye SED-er" }
        }
    }

    /** Fills a case placeholder's SED type/BUC from the RINA document-events index. */
    private fun enrichFromDocumentEvents(environment: String, sed: NavRinasakSed): NavRinasakSed {
        if (!sed.isPlaceholder) return sed
        val info = documentInfoIndex.get(environment, sed.rinasakId) ?: return sed
        return sed.copy(
            sedType = sed.sedType ?: info.sedType,
            bucType = sed.bucType ?: info.bucType,
            opprettetBruker = sed.opprettetBruker ?: info.creator,
            opprettetTidspunkt = sed.opprettetTidspunkt ?: info.creationDate,
        )
    }

    private fun enrichStoredPlaceholder(environment: String, rinasakId: Int, broadcast: Boolean) {
        val info = documentInfoIndex.get(environment, rinasakId) ?: return
        val updated = store.enrichPlaceholder(
            environment = environment,
            rinasakId = rinasakId,
            sedType = info.sedType,
            bucType = info.bucType,
            opprettetBruker = info.creator,
            opprettetTidspunkt = info.creationDate,
        )
        if (updated != null && broadcast) sseRegistry.broadcast("nav-rinasak-sed", updated)
    }

    private fun sentStatusFor(environment: String, sed: NavRinasakSed): SentStatus =
        if (sentSedIndex.isSent(environment, sed.rinasakId, sed.sedId, sed.sedType)) {
            SentStatus.SENDT
        } else {
            SentStatus.IKKE_SENDT
        }

    private fun creationInstant(sed: NavRinasakSed): Instant =
        parseInstant(sed.opprettetTidspunkt)
            ?: parseInstant(sed.navRinasakOpprettetTidspunkt)
            ?: Instant.now()

    private fun parseInstant(value: String?): Instant? =
        value?.let { runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() }
}
