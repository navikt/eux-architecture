package no.nav.eux.portal.core.navrinasak.sse

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.ConcurrentHashMap

/**
 * Dedicated SSE registry for the "SED-er i nEESSI" page, kept separate from the
 * Kafka pages' [no.nav.eux.portal.core.sse.SseEmitterRegistry] so the two
 * feature streams never cross-broadcast.
 */
@Component
class NavRinasakSseRegistry {

    private val log = logger {}
    private val emitters = ConcurrentHashMap.newKeySet<SseEmitter>()

    fun subscribe(emitter: SseEmitter) {
        emitters.add(emitter)
        log.info { "nav-rinasak SSE subscriber tilkoblet, totalt=${emitters.size}" }
    }

    fun unsubscribe(emitter: SseEmitter) {
        emitters.remove(emitter)
        log.info { "nav-rinasak SSE subscriber frakoblet, gjenstående=${emitters.size}" }
    }

    fun broadcast(eventName: String, data: Any) {
        val dead = mutableSetOf<SseEmitter>()
        for (emitter in emitters) {
            try {
                emitter.send(
                    SseEmitter.event()
                        .name(eventName)
                        .data(data),
                )
            } catch (_: Exception) {
                dead.add(emitter)
            }
        }
        if (dead.isNotEmpty()) {
            emitters.removeAll(dead)
            log.debug { "Fjernet ${dead.size} døde nav-rinasak SSE-tilkoblinger" }
        }
    }

    fun subscriberCount(): Int = emitters.size
}
