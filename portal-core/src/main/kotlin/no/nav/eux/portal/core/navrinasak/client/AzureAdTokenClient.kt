package no.nav.eux.portal.core.navrinasak.client

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * Minimal Azure AD client_credentials helper for portal-core's outbound calls to
 * eux-nav-rinasak. Mirrors the portal frontend's `lib/azureToken.ts`.
 *
 * Reads the NAIS-injected env vars (`AZURE_OPENID_CONFIG_TOKEN_ENDPOINT`,
 * `AZURE_APP_CLIENT_ID`, `AZURE_APP_CLIENT_SECRET`) — available because
 * `azure.application.enabled: true` in the NAIS manifest — and caches the access
 * token per scope until ~60 s before expiry.
 */
@Component
class AzureAdTokenClient(
    @param:Value("\${azure.openid.config.token.endpoint:\${AZURE_OPENID_CONFIG_TOKEN_ENDPOINT:}}")
    private val tokenEndpoint: String,
    @param:Value("\${azure.app.client.id:\${AZURE_APP_CLIENT_ID:}}")
    private val clientId: String,
    @param:Value("\${azure.app.client.secret:\${AZURE_APP_CLIENT_SECRET:}}")
    private val clientSecret: String,
) {

    private val log = logger {}
    private val restClient = RestClient.create()
    private val cache = ConcurrentHashMap<String, CachedToken>()

    fun getToken(scope: String): String {
        val cached = cache[scope]
        if (cached != null && cached.expiresAt.isAfter(Instant.now())) {
            return cached.token
        }
        check(tokenEndpoint.isNotBlank() && clientId.isNotBlank() && clientSecret.isNotBlank()) {
            "Azure AD client_credentials-variabler mangler — kjører utenfor NAIS?"
        }
        val body = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "client_credentials")
            add("client_id", clientId)
            add("client_secret", clientSecret)
            add("scope", scope)
        }
        val response = restClient.post()
            .uri(tokenEndpoint)
            .body(body)
            .retrieve()
            .body(TokenResponse::class.java)
            ?: error("Tomt svar fra Azure AD token-endepunkt")
        val expiresAt = Instant.now().plusSeconds((response.expiresIn - 60).coerceAtLeast(0))
        cache[scope] = CachedToken(response.accessToken, expiresAt)
        log.debug { "Hentet nytt Azure-token for scope=$scope (utløper $expiresAt)" }
        return response.accessToken
    }

    private data class CachedToken(val token: String, val expiresAt: Instant)

    @JsonIgnoreProperties(ignoreUnknown = true)
    private data class TokenResponse(
        @param:JsonProperty("access_token") val accessToken: String,
        @param:JsonProperty("expires_in") val expiresIn: Long = 3600,
    )
}
