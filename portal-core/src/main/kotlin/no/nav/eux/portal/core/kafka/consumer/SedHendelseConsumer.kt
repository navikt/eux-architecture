package no.nav.eux.portal.core.kafka.consumer

import com.fasterxml.jackson.databind.ObjectMapper
import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import no.nav.eux.portal.core.kafka.store.SedHendelseStore
import no.nav.eux.portal.core.sse.SseEmitterRegistry
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import java.time.Instant

@Service
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class SedHendelseConsumer(
    private val objectMapper: ObjectMapper,
    private val store: SedHendelseStore,
    private val sseRegistry: SseEmitterRegistry,
) {

    val log = logger {}

    @KafkaListener(
        id = "eux-portal-core-sed-hendelser",
        topics = [
            "\${kafka.topics.sedmottatt-v1-q1}",
            "\${kafka.topics.sedmottatt-v1-q2}",
            "\${kafka.topics.sedsendt-v1-q1}",
            "\${kafka.topics.sedsendt-v1-q2}",
        ],
        containerFactory = "sedHendelseKafkaListenerContainerFactory",
    )
    fun onSedHendelse(record: ConsumerRecord<String, String>) {
        try {
            val hendelse = objectMapper.readValue(record.value(), SedHendelse::class.java)
            val (environment, direction) = parseTopicMetadata(record.topic())
            val sedRecord = SedHendelseRecord(
                hendelse = hendelse,
                topic = record.topic(),
                environment = environment,
                direction = direction,
                receivedAt = Instant.now(),
                offset = record.offset(),
                partition = record.partition(),
            )
            store.add(sedRecord)
            sseRegistry.broadcast("sed-hendelse", sedRecord)
            log.debug { "SED-hendelse fra ${record.topic()}: ${hendelse.sedType} rinaSakId=${hendelse.rinaSakId}" }
        } catch (e: Exception) {
            log.warn(e) { "Feil ved prosessering av Kafka-melding fra ${record.topic()} offset=${record.offset()}" }
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
