package no.nav.eux.portal.core.kafka.config

import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.*
import org.apache.kafka.common.config.SslConfigs.*
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.core.ConsumerFactory
import org.springframework.kafka.core.DefaultKafkaConsumerFactory

@Configuration
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class KafkaConfig(
    @param:Value("\${kafka.bootstrap-servers}")
    private val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    private val securityProtocol: String,
    private val ssl: KafkaSslProperties,
) {

    @Bean
    fun sedHendelseConsumerFactory(): ConsumerFactory<String, String> {
        val props = mutableMapOf<String, Any>(
            BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
            KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            AUTO_OFFSET_RESET_CONFIG to "latest",
            ENABLE_AUTO_COMMIT_CONFIG to true,
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
        return DefaultKafkaConsumerFactory(props)
    }

    @Bean
    fun sedHendelseKafkaListenerContainerFactory(
        sedHendelseConsumerFactory: ConsumerFactory<String, String>,
    ): ConcurrentKafkaListenerContainerFactory<String, String> {
        val factory = ConcurrentKafkaListenerContainerFactory<String, String>()
        factory.setConsumerFactory(sedHendelseConsumerFactory)
        return factory
    }
}
