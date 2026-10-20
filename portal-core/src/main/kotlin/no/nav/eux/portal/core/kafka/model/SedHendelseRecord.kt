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
        /**
         * [receivedAt] is the Kafka record timestamp, so the live listener and
         * the startup backfill give the same value for the same message.
         */
        fun of(hendelse: SedHendelse, record: ConsumerRecord<*, *>): SedHendelseRecord {
            val (environment, direction) = TopicMetadata.parse(record.topic())
            return SedHendelseRecord(
                hendelse = hendelse,
                topic = record.topic(),
                environment = environment,
                direction = direction,
                receivedAt = timestampOf(record),
                offset = record.offset(),
                partition = record.partition(),
            )
        }

        private fun timestampOf(record: ConsumerRecord<*, *>): Instant =
            record.timestamp()
                .takeUnless { it == ConsumerRecord.NO_TIMESTAMP }
                ?.let(Instant::ofEpochMilli)
                ?: Instant.now()
    }
}
