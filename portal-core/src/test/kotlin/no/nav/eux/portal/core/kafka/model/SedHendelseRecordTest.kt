package no.nav.eux.portal.core.kafka.model

import io.kotest.matchers.comparables.shouldBeGreaterThanOrEqualTo
import io.kotest.matchers.shouldBe
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.header.internals.RecordHeaders
import org.apache.kafka.common.record.TimestampType
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.Optional

class SedHendelseRecordTest {

    private val hendelse = SedHendelse(rinaSakId = "1")

    private fun consumerRecord(timestamp: Long) =
        ConsumerRecord(
            "eessibasis.sedsendt-v1-q1", 2, 42L, timestamp, TimestampType.CREATE_TIME,
            0, 0, "key", "value", RecordHeaders(), Optional.empty(),
        )

    @Test
    fun `receivedAt is the Kafka record timestamp`() {
        val timestamp = Instant.parse("2026-10-20T10:15:30.123Z")
        val record = SedHendelseRecord.of(hendelse, consumerRecord(timestamp.toEpochMilli()))
        record.receivedAt shouldBe timestamp
    }

    @Test
    fun `the same Kafka record always gives the same receivedAt`() {
        val consumerRecord = consumerRecord(1_760_000_000_000L)
        val first = SedHendelseRecord.of(hendelse, consumerRecord)
        Thread.sleep(5)
        SedHendelseRecord.of(hendelse, consumerRecord) shouldBe first
    }

    @Test
    fun `falls back to now when the record has no timestamp`() {
        val before = Instant.now()
        val record = SedHendelseRecord.of(hendelse, consumerRecord(ConsumerRecord.NO_TIMESTAMP))
        record.receivedAt shouldBeGreaterThanOrEqualTo before
    }

    @Test
    fun `copies topic metadata and position from the Kafka record`() {
        val record = SedHendelseRecord.of(hendelse, consumerRecord(0L))
        record.topic shouldBe "eessibasis.sedsendt-v1-q1"
        record.environment shouldBe "q1"
        record.direction shouldBe "sendt"
        record.partition shouldBe 2
        record.offset shouldBe 42L
    }
}
