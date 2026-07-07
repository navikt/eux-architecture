package no.nav.eux.portal.core.navrinasak.rina

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.TopicMetadata
import no.nav.eux.portal.core.kafka.config.KafkaConsumerPropsBuilder
import org.apache.kafka.clients.consumer.ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.GROUP_ID_CONFIG
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.TopicPartition
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.time.Duration
import java.util.UUID
import kotlin.math.max

/**
 * One-shot startup job that seeds [RinaDocumentInfoIndex] with recent RINA
 * document events so the portal knows the SED type of cases created shortly
 * before a (re)start — including SEDs whose CREATE event has already passed the
 * live consumer's `latest` offset. Mirrors
 * [no.nav.eux.portal.core.kafka.consumer.SedHendelseBackfill]: a throwaway
 * KafkaConsumer with `assign()` (no group membership) and
 * `enable.auto.commit=false`, so it never touches committed offsets nor
 * interferes with the live listener.
 */
@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class RinaDocumentEventBackfill(
    private val objectMapper: ObjectMapper,
    private val documentInfoIndex: RinaDocumentInfoIndex,
    private val propsBuilder: KafkaConsumerPropsBuilder,
    @param:Value("\${kafka.bootstrap-servers}")
    private val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    private val securityProtocol: String,
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
        val topics = listOf(documentEventsQ1, documentEventsQ2)
        val props = propsBuilder.build(
            bootstrapServers = bootstrapServers,
            securityProtocol = securityProtocol,
            extra = mapOf(
                GROUP_ID_CONFIG to "eux-portal-core-rina-doc-backfill-${UUID.randomUUID()}",
                ENABLE_AUTO_COMMIT_CONFIG to false,
            ),
        )
        KafkaConsumer<String, String>(props).use { consumer ->
            topics.forEach { topic ->
                runCatching { backfillTopic(consumer, topic) }
                    .onFailure { log.warn(it) { "RINA document-event backfill feilet for topic=$topic" } }
            }
        }
    }

    private fun backfillTopic(consumer: KafkaConsumer<String, String>, topic: String) {
        val partitionInfos = consumer.partitionsFor(topic) ?: emptyList()
        if (partitionInfos.isEmpty()) {
            log.info { "RINA document-event backfill: ingen partisjoner for topic=$topic" }
            return
        }
        val partitions = partitionInfos.map { TopicPartition(topic, it.partition()) }
        consumer.assign(partitions)

        val endOffsets = consumer.endOffsets(partitions)
        val beginningOffsets = consumer.beginningOffsets(partitions)
        val perPartition = max(1, (perTopic + partitions.size - 1) / partitions.size)

        val targetCounts = mutableMapOf<TopicPartition, Long>()
        partitions.forEach { tp ->
            val end = endOffsets[tp] ?: 0L
            val begin = beginningOffsets[tp] ?: 0L
            val seekTo = max(begin, end - perPartition)
            consumer.seek(tp, seekTo)
            targetCounts[tp] = end - seekTo
        }
        if (targetCounts.values.sum() == 0L) {
            log.info { "RINA document-event backfill: ingen historikk for topic=$topic" }
            return
        }

        val environment = TopicMetadata.parse(topic).environment
        var recorded = 0
        val perPartitionRead = partitions.associateWith { 0L }.toMutableMap()
        val deadline = System.nanoTime() + Duration.ofMillis(pollTimeoutMs * 3).toNanos()

        while (System.nanoTime() < deadline) {
            val records = consumer.poll(Duration.ofMillis(pollTimeoutMs))
            if (records.isEmpty) break
            records.forEach { rec ->
                val tp = TopicPartition(rec.topic(), rec.partition())
                val target = targetCounts[tp] ?: 0L
                if ((perPartitionRead[tp] ?: 0L) >= target) return@forEach
                try {
                    val event = objectMapper.readValue(rec.value(), RinaDocumentEvent::class.java)
                    if (documentInfoIndex.record(environment, event) != null) recorded++
                    perPartitionRead[tp] = (perPartitionRead[tp] ?: 0L) + 1
                } catch (e: Exception) {
                    log.warn(e) { "RINA document-event backfill: kunne ikke parse melding topic=${rec.topic()} offset=${rec.offset()}" }
                }
            }
            if (perPartitionRead.all { (tp, n) -> n >= (targetCounts[tp] ?: 0L) }) break
        }
        log.info { "RINA document-event backfill: indekserte $recorded caser fra topic=$topic" }
    }
}
