package no.nav.eux.portal.core.sse

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * Sends a heartbeat on every SSE registry. A client that disconnects is only
 * noticed when a write to it fails, usually the second heartbeat after it
 * leaves, so the interval bounds how long a dead client stays registered.
 */
@Component
class SseHeartbeatScheduler(
    private val registries: List<AbstractSseEmitterRegistry>,
) {

    @Scheduled(fixedDelay = HEARTBEAT_INTERVAL_MS)
    fun sendHeartbeats() = registries.forEach { it.heartbeat() }

    companion object {
        const val HEARTBEAT_INTERVAL_MS = 15_000L
    }
}
