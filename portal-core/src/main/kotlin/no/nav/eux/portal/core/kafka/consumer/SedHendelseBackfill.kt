package no.nav.eux.portal.core.kafka.consumer

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.TopicMetadata
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import no.nav.eux.portal.core.kafka.store.SedHendelseStore
import no.nav.eux.portal.core.navrinasak.correlation.NavRinasakSentCorrelator
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.time.Instant

/**
 * One-shot startup job: seeds [SedHendelseStore] with the most recent
 * messages from each configured topic so the UI isn't empty after a clean
 * restart. See [KafkaTailReader] for how this avoids touching committed offsets.
 */
@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class SedHendelseBackfill(
    private val objectMapper: ObjectMapper,
    private val store: SedHendelseStore,
    private val tailReader: KafkaTailReader,
    private val navRinasakSentCorrelator: NavRinasakSentCorrelator,
    @param:Value("\${kafka.topics.sedmottatt-v1-q1}")
    private val sedmottattQ1: String,
    @param:Value("\${kafka.topics.sedmottatt-v1-q2}")
    private val sedmottattQ2: String,
    @param:Value("\${kafka.topics.sedsendt-v1-q1}")
    private val sedsendtQ1: String,
    @param:Value("\${kafka.topics.sedsendt-v1-q2}")
    private val sedsendtQ2: String,
    @param:Value("\${portal.kafka.backfill.per-topic:10}")
    private val perTopic: Int,
    @param:Value("\${portal.kafka.backfill.poll-timeout-ms:2000}")
    private val pollTimeoutMs: Long,
) : ApplicationRunner {

    private val log = logger {}

    override fun run(args: ApplicationArguments) {
        if (perTopic <= 0) {
            log.info { "SED-hendelse backfill disabled (per-topic=$perTopic)" }
            return
        }
        tailReader.readLatest(
            topics = listOf(sedmottattQ1, sedmottattQ2, sedsendtQ1, sedsendtQ2),
            perTopic = perTopic,
            pollTimeoutMs = pollTimeoutMs,
            groupIdPrefix = "eux-portal-core-backfill",
        ) { topic, records ->
            val collected = records.mapNotNull { rec ->
                runCatching {
                    val hendelse = objectMapper.readValue(rec.value(), SedHendelse::class.java)
                    SedHendelseRecord.of(hendelse, rec, receivedAt = Instant.ofEpochMilli(rec.timestamp()))
                }.onFailure {
                    log.warn(it) { "Backfill: kunne ikke parse melding topic=${rec.topic()} offset=${rec.offset()}" }
                }.getOrNull()
            }
            // Oldest first: store.add() uses addFirst, so the newest ends up at the front.
            var added = 0
            collected.sortedBy { it.receivedAt }.forEach { record ->
                if (!store.add(record)) return@forEach
                added++
                if (record.direction == TopicMetadata.DIRECTION_SENDT) {
                    navRinasakSentCorrelator.onSedSendt(record.environment, record.hendelse)
                }
            }
            log.info { "Backfill: la til $added historiske meldinger fra topic=$topic" }
        }
    }
}
