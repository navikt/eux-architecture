package no.nav.eux.portal.core.sse

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.ConcurrentHashMap

/**
 * Shared machinery for the portal's Server-Sent-Events fan-out: a thread-safe
 * set of [SseEmitter]s that [open] registers and unregisters on completion,
 * timeout or error, a [broadcast] that prunes emitters which fail to receive,
 * a [heartbeat] that [SseHeartbeatScheduler] sends to every registry, and a
 * subscriber count.
 *
 * A concrete registry exists per feature stream (the Kafka pages'
 * [SseEmitterRegistry] vs. the nav-rinasak monitor's
 * `NavRinasakSseRegistry`) so the streams never cross-broadcast; [label] only
 * distinguishes them in the logs.
 */
abstract class AbstractSseEmitterRegistry(private val label: String) {

    private val log = logger {}
    private val emitters = ConcurrentHashMap.newKeySet<SseEmitter>()

    /** Creates an emitter for a new client and keeps it registered while it is open. */
    fun open(timeoutMs: Long = DEFAULT_TIMEOUT_MS): SseEmitter {
        val emitter = SseEmitter(timeoutMs)
        subscribe(emitter)
        emitter.onCompletion { unsubscribe(emitter) }
        emitter.onTimeout {
            unsubscribe(emitter)
            emitter.complete()
        }
        emitter.onError {
            unsubscribe(emitter)
            emitter.complete()
        }
        // Spring only commits the response on the first send; without this the
        // client's EventSource stays "connecting" until the first heartbeat.
        emitter.send(SseEmitter.event().comment("connected"))
        return emitter
    }

    private fun subscribe(emitter: SseEmitter) {
        emitters.add(emitter)
        log.info { "$label subscriber tilkoblet, totalt=${emitters.size}" }
    }

    private fun unsubscribe(emitter: SseEmitter) {
        if (emitters.remove(emitter)) {
            log.info { "$label subscriber frakoblet, gjenstående=${emitters.size}" }
        }
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

    /**
     * Keeps idle connections open and finds clients that have gone away: a
     * write to a closed connection fails, so [broadcast] prunes the emitter.
     */
    fun heartbeat() {
        if (emitters.isEmpty()) return
        broadcast("heartbeat", mapOf("type" to "heartbeat"))
        log.debug { "$label heartbeat sendt, abonnenter=${emitters.size}" }
    }

    fun subscriberCount(): Int = emitters.size

    private companion object {
        const val DEFAULT_TIMEOUT_MS = 3_600_000L
    }
}
