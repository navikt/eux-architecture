package no.nav.eux.portal.core.navrinasak.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "portal.navrinasak")
data class NavRinasakProperties(
    val enabled: Boolean = false,
    val pollIntervalMs: Long = 5000,
    val antall: Int = 200,
    val environments: Map<String, EnvConfig> = emptyMap(),
) {
    data class EnvConfig(
        val baseUrl: String = "",
        val scope: String = "",
    )

    /** Environments that are fully configured (base-url + scope present). */
    fun activeEnvironments(): Map<String, EnvConfig> =
        environments.filterValues { it.baseUrl.isNotBlank() && it.scope.isNotBlank() }
}
