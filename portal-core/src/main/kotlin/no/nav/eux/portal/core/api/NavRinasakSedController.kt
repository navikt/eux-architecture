package no.nav.eux.portal.core.api

import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import no.nav.eux.portal.core.navrinasak.sse.NavRinasakSseRegistry
import no.nav.eux.portal.core.navrinasak.store.NavRinasakSedStore
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/nav-rinasak/sed-er")
class NavRinasakSedController(
    private val store: NavRinasakSedStore,
    private val sseRegistry: NavRinasakSseRegistry,
) {

    @GetMapping
    fun getSeds(
        @RequestParam(required = false) environment: String?,
        @RequestParam(required = false, defaultValue = "false") onlyNotSent: Boolean,
    ): List<NavRinasakSedRecord> = store.getFiltered(environment, onlyNotSent)

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
