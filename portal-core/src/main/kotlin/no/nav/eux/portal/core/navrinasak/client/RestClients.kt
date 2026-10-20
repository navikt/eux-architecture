package no.nav.eux.portal.core.navrinasak.client

import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.time.Duration

/** A [RestClient] with timeouts, so a hanging upstream cannot block the scheduler thread. */
internal fun restClientWithTimeouts(): RestClient =
    RestClient.builder()
        .requestFactory(
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(Duration.ofSeconds(5))
                setReadTimeout(Duration.ofSeconds(30))
            },
        )
        .build()
