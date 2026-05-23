package no.nav.eux.portal.core.kafka.consumer

import com.fasterxml.jackson.databind.ObjectMapper
import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.config.KafkaConfig
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import no.nav.eux.portal.core.kafka.store.SedHendelseStore
import no.nav.eux.portal.core.sse.SseEmitterRegistry
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant

private const val GROUP_ID = "eux-portal-core"
private const val RETRY_DELAY_MS = 10_000L

@Service
class SedHendelseConsumer(
    private val objectMapper: ObjectMapper,
    private val store: SedHendelseStore,
    private val sseRegistry: SseEmitterRegistry,
    private val kafkaConfig: KafkaConfig,
    @param:Value("\${portal.kafka.enabled:false}") private val kafkaEnabled: Boolean,
    @param:Value("\${kafka.topics.sedmottatt-v1-q1}") private val topicMottattQ1: String,
    @param:Value("\${kafka.topics.sedmottatt-v1-q2}") private val topicMottattQ2: String,
    @param:Value("\${kafka.topics.sedsendt-v1-q1}") private val topicSendtQ1: String,
    @param:Value("\${kafka.topics.sedsendt-v1-q2}") private val topicSendtQ2: String,
) {

    val log = logger {}

    @Volatile
    private var running = true

    @EventListener(ApplicationReadyEvent::class)
    fun startPolling() {
        if (!kafkaEnabled) {
            log.info { "Kafka-polling deaktivert (portal.kafka.enabled=false)" }
            return
        }

        val topics = listOf(topicMottattQ1, topicMottattQ2, topicSendtQ1, topicSendtQ2)
        log.info { "Starter Kafka-polling for $topics" }

        Thread({
            while (running) {
                try {
                    pollLoop(topics)
                } catch (e: Exception) {
                    log.error(e) { "Kafka-polling feilet, prøver igjen om ${RETRY_DELAY_MS / 1000}s" }
                    Thread.sleep(RETRY_DELAY_MS)
                }
            }
        }, "kafka-sed-poller").apply {
            isDaemon = true
            start()
        }
    }

    private fun pollLoop(topics: List<String>) {
        KafkaConsumer<String, String>(kafkaConfig.consumerProperties(GROUP_ID)).use { consumer ->
            consumer.subscribe(topics)
            log.info { "Kafka-consumer abonnerer på ${topics.size} topics" }

            while (running) {
                val records = consumer.poll(Duration.ofSeconds(5))
                records.forEach { processRecord(it.topic(), it.value(), it.offset(), it.partition()) }
            }
        }
    }

    private fun processRecord(topic: String, value: String, offset: Long, partition: Int) {
        try {
            val hendelse = objectMapper.readValue(value, SedHendelse::class.java)
            val (environment, direction) = parseTopicMetadata(topic)
            val record = SedHendelseRecord(
                hendelse = hendelse,
                topic = topic,
                environment = environment,
                direction = direction,
                receivedAt = Instant.now(),
                offset = offset,
                partition = partition,
            )
            store.add(record)
            sseRegistry.broadcast("sed-hendelse", record)
            log.debug { "SED-hendelse fra $topic: ${hendelse.sedType} rinaSakId=${hendelse.rinaSakId}" }
        } catch (e: Exception) {
            log.warn(e) { "Feil ved prosessering av Kafka-melding fra $topic" }
        }
    }

    private fun parseTopicMetadata(topic: String): Pair<String, String> {
        val environment = when {
            topic.endsWith("-q1") -> "q1"
            topic.endsWith("-q2") -> "q2"
            else -> "unknown"
        }
        val direction = when {
            topic.contains("sedmottatt") -> "mottatt"
            topic.contains("sedsendt") -> "sendt"
            else -> "unknown"
        }
        return environment to direction
    }
}
