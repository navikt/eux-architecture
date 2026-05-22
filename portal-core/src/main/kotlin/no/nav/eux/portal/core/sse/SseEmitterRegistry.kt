package no.nav.eux.portal.core.sse

import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.ConcurrentHashMap

private val log = KotlinLogging.logger {}

@Component
class SseEmitterRegistry {

    private val emitters = ConcurrentHashMap.newKeySet<SseEmitter>()

    fun subscribe(emitter: SseEmitter) {
        emitters.add(emitter)
        log.info { "SSE subscriber tilkoblet, totalt=${emitters.size}" }
    }

    fun unsubscribe(emitter: SseEmitter) {
        emitters.remove(emitter)
        log.info { "SSE subscriber frakoblet, gjenstående=${emitters.size}" }
    }

    fun broadcast(eventName: String, data: Any) {
        val dead = mutableSetOf<SseEmitter>()
        for (emitter in emitters) {
            try {
                emitter.send(
                    SseEmitter.event()
                        .name(eventName)
                        .data(data)
                )
            } catch (_: Exception) {
                dead.add(emitter)
            }
        }
        if (dead.isNotEmpty()) {
            emitters.removeAll(dead)
            log.debug { "Fjernet ${dead.size} døde SSE-tilkoblinger" }
        }
    }

    fun subscriberCount(): Int = emitters.size
}
