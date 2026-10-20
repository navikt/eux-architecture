package no.nav.eux.portal.core.sse

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

class AbstractSseEmitterRegistryTest {

    private val registry = object : AbstractSseEmitterRegistry("test") {}

    @Test
    fun `heartbeat keeps live clients registered`() {
        registry.open()
        registry.open()
        registry.heartbeat()
        registry.subscriberCount() shouldBe 2
    }

    @Test
    fun `heartbeat prunes a client whose connection is gone`() {
        registry.open()
        // Completing outside a request mimics a dropped connection: the
        // registry is not told, and the next write fails.
        registry.open().complete()
        registry.subscriberCount() shouldBe 2
        registry.heartbeat()
        registry.subscriberCount() shouldBe 1
    }

    @Test
    fun `heartbeat without subscribers does nothing`() {
        registry.heartbeat()
        registry.subscriberCount() shouldBe 0
    }
}
