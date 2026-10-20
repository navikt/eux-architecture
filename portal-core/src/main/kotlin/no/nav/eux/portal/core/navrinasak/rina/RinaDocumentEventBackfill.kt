package no.nav.eux.portal.core.navrinasak.rina

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.TopicMetadata
import no.nav.eux.portal.core.kafka.consumer.KafkaTailReader
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper

/**
 * One-shot startup job that seeds [RinaDocumentInfoIndex] with recent RINA
 * document events so the portal knows the SED type of cases created shortly
 * before a (re)start — including SEDs whose CREATE event has already passed the
 * live consumer's `latest` offset. See [KafkaTailReader] for how this avoids
 * touching committed offsets.
 */
@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class RinaDocumentEventBackfill(
    private val objectMapper: ObjectMapper,
    private val documentInfoIndex: RinaDocumentInfoIndex,
    private val tailReader: KafkaTailReader,
    @param:Value("\${kafka.topics.rina-document-events-v1-q1}")
    private val documentEventsQ1: String,
    @param:Value("\${kafka.topics.rina-document-events-v1-q2}")
    private val documentEventsQ2: String,
    @param:Value("\${portal.navrinasak.rina-backfill.per-topic:500}")
    private val perTopic: Int,
    @param:Value("\${portal.navrinasak.rina-backfill.poll-timeout-ms:2000}")
    private val pollTimeoutMs: Long,
) : ApplicationRunner {

    private val log = logger {}

    override fun run(args: ApplicationArguments) {
        if (perTopic <= 0) {
            log.info { "RINA document-event backfill disabled (per-topic=$perTopic)" }
            return
        }
        tailReader.readLatest(
            topics = listOf(documentEventsQ1, documentEventsQ2),
            perTopic = perTopic,
            pollTimeoutMs = pollTimeoutMs,
            groupIdPrefix = "eux-portal-core-rina-doc-backfill",
        ) { topic, records ->
            val environment = TopicMetadata.parse(topic).environment
            val recorded = records.count { rec ->
                runCatching {
                    val event = objectMapper.readValue(rec.value(), RinaDocumentEvent::class.java)
                    documentInfoIndex.record(environment, event) != null
                }.onFailure {
                    log.warn(it) { "RINA document-event backfill: kunne ikke parse melding topic=${rec.topic()} offset=${rec.offset()}" }
                }.getOrDefault(false)
            }
            log.info { "RINA document-event backfill: indekserte $recorded caser fra topic=$topic" }
        }
    }
}
