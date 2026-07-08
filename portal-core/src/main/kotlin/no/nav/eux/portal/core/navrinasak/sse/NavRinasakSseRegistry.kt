package no.nav.eux.portal.core.navrinasak.sse

import no.nav.eux.portal.core.sse.AbstractSseEmitterRegistry
import org.springframework.stereotype.Component

/**
 * Dedicated SSE registry for the "SED-er i nEESSI" page, kept separate from the
 * Kafka pages' [no.nav.eux.portal.core.sse.SseEmitterRegistry] so the two
 * feature streams never cross-broadcast.
 */
@Component
class NavRinasakSseRegistry : AbstractSseEmitterRegistry("nav-rinasak SSE")
