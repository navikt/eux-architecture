package no.nav.eux.portal.core.kafka.config

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.*
import org.apache.kafka.common.config.SslConfigs.*
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.annotation.EnableKafka
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.core.DefaultKafkaConsumerFactory
import java.time.Duration.ofSeconds

@Configuration
@EnableKafka
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class KafkaConfig(
    @param:Value("\${kafka.bootstrap-servers}")
    val bootstrapServers: String,
    @param:Value("\${kafka.properties.security.protocol}")
    val securityProtocol: String,
    val kafkaSslProperties: KafkaSslProperties,
) {

    val log = logger {}

    @Bean
    fun sedHendelseKafkaListenerContainerFactory(): ConcurrentKafkaListenerContainerFactory<String, String> {
        val factory = ConcurrentKafkaListenerContainerFactory<String, String>()
        factory.setConsumerFactory(DefaultKafkaConsumerFactory(consumerConfiguration()))
        factory.containerProperties.setAuthExceptionRetryInterval(ofSeconds(10))
        factory.containerProperties.isMissingTopicsFatal = false
        log.info { "Kafka konfigurert mot $bootstrapServers" }
        return factory
    }

    private fun consumerConfiguration() = mapOf(
        BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
        GROUP_ID_CONFIG to "eux-portal-core",
        AUTO_OFFSET_RESET_CONFIG to "latest",
        KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
        VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
        ENABLE_AUTO_COMMIT_CONFIG to true,
        SECURITY_PROTOCOL_CONFIG to securityProtocol,
        SSL_KEYSTORE_TYPE_CONFIG to kafkaSslProperties.keystore.type,
        SSL_KEYSTORE_LOCATION_CONFIG to kafkaSslProperties.keystore.location,
        SSL_KEYSTORE_PASSWORD_CONFIG to kafkaSslProperties.keystore.password,
        SSL_TRUSTSTORE_TYPE_CONFIG to kafkaSslProperties.truststore.type,
        SSL_TRUSTSTORE_LOCATION_CONFIG to kafkaSslProperties.truststore.location,
        SSL_TRUSTSTORE_PASSWORD_CONFIG to kafkaSslProperties.truststore.password,
    )
}
