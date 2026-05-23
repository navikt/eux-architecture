package no.nav.eux.portal.core.kafka.config

import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.*
import org.apache.kafka.common.config.SslConfigs.*
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Properties

@Component
class KafkaConfig(
    @param:Value("\${kafka.bootstrap-servers}")
    val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    val securityProtocol: String,
    val kafkaSslProperties: KafkaSslProperties,
) {

    fun consumerProperties(groupId: String): Properties = Properties().apply {
        put(BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
        put(GROUP_ID_CONFIG, groupId)
        put(AUTO_OFFSET_RESET_CONFIG, "latest")
        put(KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
        put(VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
        put(ENABLE_AUTO_COMMIT_CONFIG, "true")
        put(SECURITY_PROTOCOL_CONFIG, securityProtocol)
        if (kafkaSslProperties.keystore.location.isNotBlank()) {
            put(SSL_KEYSTORE_TYPE_CONFIG, kafkaSslProperties.keystore.type)
            put(SSL_KEYSTORE_LOCATION_CONFIG, kafkaSslProperties.keystore.location)
            put(SSL_KEYSTORE_PASSWORD_CONFIG, kafkaSslProperties.keystore.password)
            put(SSL_TRUSTSTORE_TYPE_CONFIG, kafkaSslProperties.truststore.type)
            put(SSL_TRUSTSTORE_LOCATION_CONFIG, kafkaSslProperties.truststore.location)
            put(SSL_TRUSTSTORE_PASSWORD_CONFIG, kafkaSslProperties.truststore.password)
        }
    }
}
