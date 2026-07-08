package no.nav.eux.portal.core.sse

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.ConcurrentHashMap

/**
 * Shared machinery for the portal's Server-Sent-Events fan-out: a thread-safe
 * set of [SseEmitter]s with subscribe/unsubscribe, a [broadcast] that prunes
 * emitters which fail to receive, and a subscriber count.
 *
 * A concrete registry exists per feature stream (the Kafka pages'
 * [SseEmitterRegistry] vs. the nav-rinasak monitor's
 * `NavRinasakSseRegistry`) so the streams never cross-broadcast; [label] only
 * distinguishes them in the logs.
 */
abstract class AbstractSseEmitterRegistry(private val label: String) {

    private val log = logger {}
    private val emitters = ConcurrentHashMap.newKeySet<SseEmitter>()

    fun subscribe(emitter: SseEmitter) {
        emitters.add(emitter)
        log.info { "$label subscriber tilkoblet, totalt=${emitters.size}" }
    }

    fun unsubscribe(emitter: SseEmitter) {
        emitters.remove(emitter)
        log.info { "$label subscriber frakoblet, gjenstående=${emitters.size}" }
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
            log.debug { "Fjernet ${dead.size} døde $label-tilkoblinger" }
        }
    }

    fun subscriberCount(): Int = emitters.size
}
