package no.nav.eux.portal.core.kafka.model

import no.nav.eux.portal.core.kafka.TopicMetadata
import org.apache.kafka.clients.consumer.ConsumerRecord
import java.time.Instant

data class SedHendelseRecord(
    val hendelse: SedHendelse,
    val topic: String,
    val environment: String,
    val direction: String,
    val receivedAt: Instant,
    val offset: Long,
    val partition: Int,
) {
    companion object {
        fun of(hendelse: SedHendelse, record: ConsumerRecord<*, *>, receivedAt: Instant): SedHendelseRecord {
            val (environment, direction) = TopicMetadata.parse(record.topic())
            return SedHendelseRecord(
                hendelse = hendelse,
                topic = record.topic(),
                environment = environment,
                direction = direction,
                receivedAt = receivedAt,
                offset = record.offset(),
                partition = record.partition(),
            )
        }
    }
}
