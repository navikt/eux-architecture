package no.nav.eux.portal.core.kafka.consumer

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.config.KafkaConsumerPropsBuilder
import org.apache.kafka.clients.consumer.ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.GROUP_ID_CONFIG
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.TopicPartition
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.time.Duration
import java.util.UUID
import kotlin.math.max

/**
 * Reads the most recent records of a set of topics, used by the startup backfills
 * to seed the in-memory stores after a restart. Uses a throwaway [KafkaConsumer]
 * with `assign()` (no group membership) and `enable.auto.commit=false`, so it never
 * touches committed offsets nor interferes with the live listeners.
 */
@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class KafkaTailReader(
    private val propsBuilder: KafkaConsumerPropsBuilder,
    @param:Value("\${kafka.bootstrap-servers}")
    private val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    private val securityProtocol: String,
) {

    private val log = logger {}

    /**
     * Calls [onRecords] once per topic with up to [perTopic] of its latest records,
     * spread evenly across partitions. A failing topic is logged and skipped.
     */
    fun readLatest(
        topics: List<String>,
        perTopic: Int,
        pollTimeoutMs: Long,
        groupIdPrefix: String,
        onRecords: (topic: String, records: List<ConsumerRecord<String, String>>) -> Unit,
    ) {
        val props = propsBuilder.build(
            bootstrapServers = bootstrapServers,
            securityProtocol = securityProtocol,
            extra = mapOf(
                // assign() doesn't join a group, but some client configs/ACLs still require group.id.
                GROUP_ID_CONFIG to "$groupIdPrefix-${UUID.randomUUID()}",
                ENABLE_AUTO_COMMIT_CONFIG to false,
            ),
        )
        KafkaConsumer<String, String>(props).use { consumer ->
            topics.forEach { topic ->
                runCatching { onRecords(topic, readTopic(consumer, topic, perTopic, pollTimeoutMs)) }
                    .onFailure { log.warn(it) { "Backfill feilet for topic=$topic" } }
            }
        }
    }

    private fun readTopic(
        consumer: KafkaConsumer<String, String>,
        topic: String,
        perTopic: Int,
        pollTimeoutMs: Long,
    ): List<ConsumerRecord<String, String>> {
        val partitions = consumer.partitionsFor(topic).orEmpty().map { TopicPartition(topic, it.partition()) }
        if (partitions.isEmpty()) {
            log.info { "Backfill: ingen partisjoner for topic=$topic" }
            return emptyList()
        }
        consumer.assign(partitions)

        val endOffsets = consumer.endOffsets(partitions)
        val beginningOffsets = consumer.beginningOffsets(partitions)
        val perPartition = max(1, (perTopic + partitions.size - 1) / partitions.size)
        val remaining = partitions.associateWith { tp ->
            val end = endOffsets[tp] ?: 0L
            val seekTo = max(beginningOffsets[tp] ?: 0L, end - perPartition)
            consumer.seek(tp, seekTo)
            end - seekTo
        }.toMutableMap()
        if (remaining.values.sum() == 0L) {
            log.info { "Backfill: ingen historikk for topic=$topic" }
            return emptyList()
        }

        val collected = mutableListOf<ConsumerRecord<String, String>>()
        val deadline = System.nanoTime() + Duration.ofMillis(pollTimeoutMs * 3).toNanos()
        while (remaining.values.any { it > 0 } && System.nanoTime() < deadline) {
            val records = consumer.poll(Duration.ofMillis(pollTimeoutMs))
            if (records.isEmpty) break
            records.forEach { rec ->
                val tp = TopicPartition(rec.topic(), rec.partition())
                val left = remaining[tp] ?: 0L
                if (left > 0) {
                    collected += rec
                    remaining[tp] = left - 1
                }
            }
        }
        return collected
    }
}
