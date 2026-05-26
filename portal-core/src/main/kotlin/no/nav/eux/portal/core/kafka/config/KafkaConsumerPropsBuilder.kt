package no.nav.eux.portal.core.kafka.config

import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_KEYSTORE_LOCATION_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_KEYSTORE_PASSWORD_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_KEYSTORE_TYPE_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_LOCATION_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_PASSWORD_CONFIG
import org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class KafkaConsumerPropsBuilder(
    private val ssl: KafkaSslProperties,
) {

    fun build(
        bootstrapServers: String,
        securityProtocol: String,
        extra: Map<String, Any> = emptyMap(),
    ): MutableMap<String, Any> {
        val props = mutableMapOf<String, Any>(
            BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
            KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            SECURITY_PROTOCOL_CONFIG to securityProtocol,
        )
        if (ssl.keystore.location.isNotBlank()) {
            props[SSL_KEYSTORE_TYPE_CONFIG] = ssl.keystore.type
            props[SSL_KEYSTORE_LOCATION_CONFIG] = ssl.keystore.location
            props[SSL_KEYSTORE_PASSWORD_CONFIG] = ssl.keystore.password
            props[SSL_TRUSTSTORE_TYPE_CONFIG] = ssl.truststore.type
            props[SSL_TRUSTSTORE_LOCATION_CONFIG] = ssl.truststore.location
            props[SSL_TRUSTSTORE_PASSWORD_CONFIG] = ssl.truststore.password
        }
        props.putAll(extra)
        return props
    }
}
