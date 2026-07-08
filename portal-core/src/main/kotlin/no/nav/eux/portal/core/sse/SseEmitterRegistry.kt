package no.nav.eux.portal.core.sse

import org.springframework.stereotype.Component

/** SSE fan-out for the Kafka feed pages under `/kafka`. */
@Component
class SseEmitterRegistry : AbstractSseEmitterRegistry("SSE")
