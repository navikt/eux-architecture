package no.nav.eux.portal.core.kafka.config

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.*
import org.apache.kafka.common.config.SslConfigs.*
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.annotation.EnableKafka
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.config.KafkaListenerContainerFactory
import org.springframework.kafka.core.DefaultKafkaConsumerFactory
import org.springframework.kafka.listener.DefaultErrorHandler
import org.springframework.util.backoff.FixedBackOff
import java.time.Duration.ofSeconds

@Configuration
@EnableKafka
@ConditionalOnExpression("'\${spring.kafka.bootstrap-servers:}'.length() > 0")
class KafkaConfig(
    @Value("\${spring.kafka.bootstrap-servers}")
    val bootstrapServers: String,
    @Value("\${spring.kafka.properties.ssl.keystore.location:}")
    val keystoreLocation: String,
    @Value("\${spring.kafka.properties.ssl.keystore.password:}")
    val keystorePassword: String,
    @Value("\${spring.kafka.properties.ssl.truststore.location:}")
    val truststoreLocation: String,
    @Value("\${spring.kafka.properties.ssl.truststore.password:}")
    val truststorePassword: String,
) {

    val log = logger {}

    @Bean
    fun kafkaListenerContainerFactory(): KafkaListenerContainerFactory<*> {
        val props = mutableMapOf<String, Any>(
            BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
            GROUP_ID_CONFIG to "eux-portal-core",
            AUTO_OFFSET_RESET_CONFIG to "latest",
            KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            ENABLE_AUTO_COMMIT_CONFIG to true,
        )
        if (keystoreLocation.isNotBlank()) {
            props[SECURITY_PROTOCOL_CONFIG] = "SSL"
            props[SSL_KEYSTORE_TYPE_CONFIG] = "PKCS12"
            props[SSL_KEYSTORE_LOCATION_CONFIG] = keystoreLocation
            props[SSL_KEYSTORE_PASSWORD_CONFIG] = keystorePassword
            props[SSL_TRUSTSTORE_TYPE_CONFIG] = "PKCS12"
            props[SSL_TRUSTSTORE_LOCATION_CONFIG] = truststoreLocation
            props[SSL_TRUSTSTORE_PASSWORD_CONFIG] = truststorePassword
        }
        log.info { "Kafka konfigurert mot $bootstrapServers" }
        val factory = ConcurrentKafkaListenerContainerFactory<String, String>()
        factory.setConsumerFactory(DefaultKafkaConsumerFactory(props))
        factory.containerProperties.setAuthExceptionRetryInterval(ofSeconds(10))
        factory.containerProperties.isMissingTopicsFatal = false
        factory.setCommonErrorHandler(
            DefaultErrorHandler(FixedBackOff(5000L, 3L))
        )
        return factory
    }
}
