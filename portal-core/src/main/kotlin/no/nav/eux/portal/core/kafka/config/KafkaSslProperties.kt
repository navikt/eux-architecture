package no.nav.eux.portal.core.kafka.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("kafka.properties.ssl")
data class KafkaSslProperties(
    val keystore: StoreProperties = StoreProperties(),
    val truststore: StoreProperties = StoreProperties(),
) {
    data class StoreProperties(
        val type: String = "PKCS12",
        val location: String = "",
        val password: String = "",
    )
}
