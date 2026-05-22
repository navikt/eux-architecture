package no.nav.eux.portal.core.api

import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import no.nav.eux.portal.core.kafka.store.SedHendelseStore
import no.nav.eux.portal.core.sse.SseEmitterRegistry
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/kafka/sed-hendelser")
class SedHendelseController(
    private val store: SedHendelseStore,
    private val sseRegistry: SseEmitterRegistry,
) {

    @GetMapping
    fun getHendelser(
        @RequestParam(required = false) environment: String?,
        @RequestParam(required = false) direction: String?,
    ): List<SedHendelseRecord> = store.getFiltered(environment, direction)

    @GetMapping("/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun stream(): SseEmitter {
        val emitter = SseEmitter(3_600_000L)
        sseRegistry.subscribe(emitter)
        emitter.onCompletion { sseRegistry.unsubscribe(emitter) }
        emitter.onTimeout {
            sseRegistry.unsubscribe(emitter)
            emitter.complete()
        }
        emitter.onError {
            sseRegistry.unsubscribe(emitter)
            emitter.complete()
        }
        return emitter
    }
}
