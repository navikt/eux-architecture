package no.nav.eux.portal.core.kafka.consumer

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.TopicMetadata
import no.nav.eux.portal.core.kafka.config.KafkaConsumerPropsBuilder
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import no.nav.eux.portal.core.kafka.store.SedHendelseStore
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
import java.time.Instant
import java.util.UUID
import kotlin.math.max

/**
 * One-shot startup job: seeds [SedHendelseStore] with the most recent
 * messages from each configured topic so the UI isn't empty after a clean
 * restart. Uses a throwaway KafkaConsumer with `assign()` (no group
 * membership) and `enable.auto.commit=false` — does not touch any
 * committed offsets and does not interfere with the live KafkaListener
 * or with any other consumers of these topics.
 */
@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class SedHendelseBackfill(
    private val objectMapper: ObjectMapper,
    private val store: SedHendelseStore,
    private val propsBuilder: KafkaConsumerPropsBuilder,
    @param:Value("\${kafka.bootstrap-servers}")
    private val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    private val securityProtocol: String,
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
        val topics = listOf(sedmottattQ1, sedmottattQ2, sedsendtQ1, sedsendtQ2)
        val props = propsBuilder.build(
            bootstrapServers = bootstrapServers,
            securityProtocol = securityProtocol,
            extra = mapOf(
                // Throwaway group id — assign() doesn't join a group, but some
                // client configs/ACLs still require group.id to be set.
                GROUP_ID_CONFIG to "eux-portal-core-backfill-${UUID.randomUUID()}",
                ENABLE_AUTO_COMMIT_CONFIG to false,
            ),
        )
        KafkaConsumer<String, String>(props).use { consumer ->
            topics.forEach { topic ->
                runCatching { backfillTopic(consumer, topic) }
                    .onFailure { log.warn(it) { "Backfill feilet for topic=$topic" } }
            }
        }
    }

    private fun backfillTopic(consumer: KafkaConsumer<String, String>, topic: String) {
        val partitionInfos = consumer.partitionsFor(topic) ?: emptyList()
        if (partitionInfos.isEmpty()) {
            log.info { "Backfill: ingen partisjoner for topic=$topic" }
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
            log.info { "Backfill: ingen historikk for topic=$topic" }
            return
        }

        val collected = mutableListOf<SedHendelseRecord>()
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
                    val hendelse = objectMapper.readValue(rec.value(), SedHendelse::class.java)
                    val (environment, direction) = TopicMetadata.parse(rec.topic())
                    collected += SedHendelseRecord(
                        hendelse = hendelse,
                        topic = rec.topic(),
                        environment = environment,
                        direction = direction,
                        receivedAt = Instant.ofEpochMilli(rec.timestamp()),
                        offset = rec.offset(),
                        partition = rec.partition(),
                    )
                    perPartitionRead[tp] = (perPartitionRead[tp] ?: 0L) + 1
                } catch (e: Exception) {
                    log.warn(e) { "Backfill: kunne ikke parse melding topic=${rec.topic()} offset=${rec.offset()}" }
                }
            }
            if (perPartitionRead.all { (tp, n) -> n >= (targetCounts[tp] ?: 0L) }) break
        }

        // Sort ascending by Kafka timestamp; store.add() uses addFirst,
        // so the newest record ends up at the front of the deque.
        collected.sortBy { it.receivedAt }
        collected.forEach { store.add(it) }
        log.info { "Backfill: la til ${collected.size} historiske meldinger fra topic=$topic" }
    }
}
