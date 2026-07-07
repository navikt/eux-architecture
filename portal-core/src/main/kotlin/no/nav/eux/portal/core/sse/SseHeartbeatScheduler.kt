package no.nav.eux.portal.core.sse

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.navrinasak.sse.NavRinasakSseRegistry
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class SseHeartbeatScheduler(
    private val sseRegistry: SseEmitterRegistry,
    private val navRinasakSseRegistry: NavRinasakSseRegistry,
) {

    val log = logger {}

    @Scheduled(fixedDelay = 30_000)
    fun sendHeartbeats() {
        heartbeat("SSE", sseRegistry.subscriberCount()) {
            sseRegistry.broadcast("heartbeat", mapOf("type" to "heartbeat"))
        }
        heartbeat("nav-rinasak SSE", navRinasakSseRegistry.subscriberCount()) {
            navRinasakSseRegistry.broadcast("heartbeat", mapOf("type" to "heartbeat"))
        }
    }

    private fun heartbeat(label: String, count: Int, send: () -> Unit) {
        if (count == 0) return
        send()
        log.debug { "$label heartbeat sendt til $count abonnenter" }
    }
}
