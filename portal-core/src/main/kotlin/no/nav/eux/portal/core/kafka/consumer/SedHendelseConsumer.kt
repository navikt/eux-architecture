package no.nav.eux.portal.core.kafka.consumer

import com.fasterxml.jackson.databind.ObjectMapper
import io.github.oshai.kotlinlogging.KotlinLogging.logger
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
import java.util.Properties

@Service
class SedHendelseConsumer(
    private val objectMapper: ObjectMapper,
    private val store: SedHendelseStore,
    private val sseRegistry: SseEmitterRegistry,
    private val kafkaConsumerProperties: Properties,
    @Value("\${portal.kafka.enabled:false}") private val kafkaEnabled: Boolean,
    @Value("\${kafka.topics.sedmottatt-v1-q1}") private val topicMottattQ1: String,
    @Value("\${kafka.topics.sedmottatt-v1-q2}") private val topicMottattQ2: String,
    @Value("\${kafka.topics.sedsendt-v1-q1}") private val topicSendtQ1: String,
    @Value("\${kafka.topics.sedsendt-v1-q2}") private val topicSendtQ2: String,
) {

    val log = logger {}

    @Volatile
    private var running = true

    @EventListener(ApplicationReadyEvent::class)
    fun startPolling() {
        if (!kafkaEnabled) {
            log.info { "Kafka polling er deaktivert (portal.kafka.enabled=false)" }
            return
        }

        val topics = listOf(topicMottattQ1, topicMottattQ2, topicSendtQ1, topicSendtQ2)
        log.info { "Starter Kafka-polling for topics: $topics" }

        Thread({
            while (running) {
                try {
                    pollLoop(topics)
                } catch (e: Exception) {
                    log.error(e) { "Kafka polling feilet, prøver igjen om 10 sekunder" }
                    Thread.sleep(10_000)
                } catch (t: Throwable) {
                    log.error(t) { "Alvorlig feil i Kafka polling, prøver igjen om 30 sekunder" }
                    Thread.sleep(30_000)
                }
            }
        }, "kafka-sed-poller").apply {
            isDaemon = true
            start()
        }
    }

    private fun pollLoop(topics: List<String>) {
        KafkaConsumer<String, String>(kafkaConsumerProperties).use { consumer ->
            consumer.subscribe(topics)
            log.info { "Kafka consumer abonnerer på ${topics.size} topics" }

            while (running) {
                val records = consumer.poll(Duration.ofSeconds(5))
                for (record in records) {
                    processRecord(record.topic(), record.value(), record.offset(), record.partition())
                }
            }
        }
    }

    private fun processRecord(topic: String, value: String, offset: Long, partition: Int) {
        try {
            val hendelse = objectMapper.readValue(value, SedHendelse::class.java)
            val (environment, direction) = parseTopicMetadata(topic)
            val hendelseRecord = SedHendelseRecord(
                hendelse = hendelse,
                topic = topic,
                environment = environment,
                direction = direction,
                receivedAt = Instant.now(),
                offset = offset,
                partition = partition,
            )
            store.add(hendelseRecord)
            sseRegistry.broadcast("sed-hendelse", hendelseRecord)
            log.debug { "SED hendelse fra $topic: ${hendelse.sedType} rinaSakId=${hendelse.rinaSakId}" }
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
