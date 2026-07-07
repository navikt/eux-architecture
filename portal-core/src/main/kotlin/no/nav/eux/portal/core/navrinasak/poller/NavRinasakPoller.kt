package no.nav.eux.portal.core.navrinasak.poller

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.navrinasak.client.NavRinasakClient
import no.nav.eux.portal.core.navrinasak.config.NavRinasakProperties
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSed
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import no.nav.eux.portal.core.navrinasak.model.SentStatus
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
            val sentStatus = sentStatusFor(environment, sed)
            val receivedAt = if (isInitial) creationInstant(sed) else Instant.now()
            val record = NavRinasakSedRecord(
                sed = sed,
                environment = environment,
                receivedAt = receivedAt,
                sentStatus = sentStatus,
            )
            if (store.addIfNew(record)) {
                added++
                if (!isInitial) sseRegistry.broadcast("nav-rinasak-sed", record)
                // A real SED (journalført dokument) supersedes the case placeholder.
                if (!sed.isPlaceholder && store.removePlaceholderFor(environment, sed.rinasakId) && !isInitial) {
                    sseRegistry.broadcast(
                        "nav-rinasak-sed-removed",
                        mapOf("environment" to environment, "rinasakId" to sed.rinasakId),
                    )
                }
            }
        }
        if (isInitial) {
            log.info { "nav-rinasak $environment: seedet $added SED-er (stille)" }
        } else if (added > 0) {
            log.info { "nav-rinasak $environment: $added nye SED-er" }
        }
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
