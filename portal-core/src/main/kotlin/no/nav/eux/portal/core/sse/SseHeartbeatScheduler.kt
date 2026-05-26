package no.nav.eux.portal.core.sse

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class SseHeartbeatScheduler(
    private val sseRegistry: SseEmitterRegistry,
) {

    val log = logger {}

    @Scheduled(fixedDelay = 30_000)
    fun sendHeartbeats() {
        val count = sseRegistry.subscriberCount()
        if (count == 0) return
        sseRegistry.broadcast("heartbeat", mapOf("type" to "heartbeat"))
        log.debug { "SSE heartbeat sendt til $count abonnenter" }
    }
}
