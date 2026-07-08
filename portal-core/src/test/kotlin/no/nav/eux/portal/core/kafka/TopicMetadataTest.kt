package no.nav.eux.portal.core.kafka

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

class TopicMetadataTest {

    @Test
    fun `parses sedsendt q1`() {
        TopicMetadata.parse("eessibasis.sedsendt-v1-q1") shouldBe
            TopicMetadata.Parsed(TopicMetadata.ENV_Q1, TopicMetadata.DIRECTION_SENDT)
    }

    @Test
    fun `parses sedmottatt q2`() {
        TopicMetadata.parse("eessibasis.sedmottatt-v1-q2") shouldBe
            TopicMetadata.Parsed(TopicMetadata.ENV_Q2, TopicMetadata.DIRECTION_MOTTATT)
    }

    @Test
    fun `unknown topic yields unknown env and direction`() {
        TopicMetadata.parse("eessibasis.something-else") shouldBe
            TopicMetadata.Parsed(TopicMetadata.UNKNOWN, TopicMetadata.UNKNOWN)
    }

    @Test
    fun `direction constants have the wire values the correlator matches on`() {
        TopicMetadata.DIRECTION_SENDT shouldBe "sendt"
        TopicMetadata.DIRECTION_MOTTATT shouldBe "mottatt"
    }
}
