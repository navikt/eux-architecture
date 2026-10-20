package no.nav.eux.portal.core.kafka.store

import io.kotest.matchers.shouldBe
import no.nav.eux.portal.core.kafka.model.SedHendelse
import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import org.junit.jupiter.api.Test
import java.time.Instant

class SedHendelseStoreTest {

    private fun record(offset: Long, partition: Int = 0, topic: String = "eessibasis.sedsendt-v1-q1") =
        SedHendelseRecord(
            hendelse = SedHendelse(rinaSakId = "1"),
            topic = topic,
            environment = "q1",
            direction = "sendt",
            receivedAt = Instant.EPOCH,
            offset = offset,
            partition = partition,
        )

    @Test
    fun `add is idempotent on topic, partition and offset`() {
        val store = SedHendelseStore()
        store.add(record(offset = 1)) shouldBe true
        store.add(record(offset = 1).copy(receivedAt = Instant.now())) shouldBe false
        store.add(record(offset = 1, partition = 1)) shouldBe true
        store.add(record(offset = 1, topic = "eessibasis.sedsendt-v1-q2")) shouldBe true
        store.getAll().size shouldBe 3
    }

    @Test
    fun `keeps the newest 500 and forgets evicted keys`() {
        val store = SedHendelseStore()
        (0L until 501L).forEach { store.add(record(offset = it)) }
        store.getAll().size shouldBe 500
        store.getAll().first().offset shouldBe 500L
        store.add(record(offset = 0)) shouldBe true
    }
}
