package no.nav.eux.portal.core.navrinasak.store

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

class SentSedIndexTest {

    @Test
    fun `matches on sedId`() {
        val index = SentSedIndex()
        index.markSent("q1", "123", listOf("sed-abc"), "H001")
        index.isSent("q1", 123, "sed-abc", null) shouldBe true
    }

    @Test
    fun `falls back to sedType when sedId does not match`() {
        val index = SentSedIndex()
        index.markSent("q1", "123", listOf("sed-abc"), "H001")
        index.isSent("q1", 123, "other-sed", "H001") shouldBe true
    }

    @Test
    fun `does not match a different environment`() {
        val index = SentSedIndex()
        index.markSent("q1", "123", listOf("sed-abc"), "H001")
        index.isSent("q2", 123, "sed-abc", "H001") shouldBe false
    }

    @Test
    fun `blank rinaSakId is ignored`() {
        val index = SentSedIndex()
        index.markSent("q1", "", listOf("sed-abc"), "H001")
        index.markSent("q1", null, listOf("sed-abc"), "H001")
        index.isSent("q1", 123, "sed-abc", "H001") shouldBe false
    }

    @Test
    fun `unknown sed is not sent`() {
        val index = SentSedIndex()
        index.markSent("q1", "123", listOf("sed-abc"), "H001")
        index.isSent("q1", 999, "sed-xyz", "X999") shouldBe false
    }
}
