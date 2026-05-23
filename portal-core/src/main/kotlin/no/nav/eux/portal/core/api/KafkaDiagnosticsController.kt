package no.nav.eux.portal.core.api

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.apache.kafka.clients.CommonClientConfigs.SECURITY_PROTOCOL_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.*
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.config.SslConfigs.*
import org.apache.kafka.common.serialization.StringDeserializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.io.File
import java.time.Duration
import java.util.Properties

@RestController
@RequestMapping("/api/kafka/diagnostics")
class KafkaDiagnosticsController(
    @Value("\${kafka.bootstrap-servers}") private val bootstrapServers: String,
    @Value("\${kafka.properties.security.protocol}") private val securityProtocol: String,
    @Value("\${kafka.properties.ssl.keystore.type}") private val keystoreType: String,
    @Value("\${kafka.properties.ssl.keystore.location}") private val keystoreLocation: String,
    @Value("\${kafka.properties.ssl.keystore.password}") private val keystorePassword: String,
    @Value("\${kafka.properties.ssl.truststore.type}") private val truststoreType: String,
    @Value("\${kafka.properties.ssl.truststore.location}") private val truststoreLocation: String,
    @Value("\${kafka.properties.ssl.truststore.password}") private val truststorePassword: String,
    @Value("\${kafka.topics.sedmottatt-v1-q1}") private val topicMottattQ1: String,
) {

    val log = logger {}

    @GetMapping
    fun diagnose(): Map<String, Any?> {
        val result = mutableMapOf<String, Any?>()

        result["bootstrapServers"] = bootstrapServers
        result["securityProtocol"] = securityProtocol
        result["keystoreType"] = keystoreType
        result["keystoreLocation"] = keystoreLocation
        result["keystoreExists"] = keystoreLocation.isNotBlank() && File(keystoreLocation).exists()
        result["keystoreSize"] = if (keystoreLocation.isNotBlank()) File(keystoreLocation).let { if (it.exists()) it.length() else -1 } else -1
        result["truststoreType"] = truststoreType
        result["truststoreLocation"] = truststoreLocation
        result["truststoreExists"] = truststoreLocation.isNotBlank() && File(truststoreLocation).exists()
        result["truststoreSize"] = if (truststoreLocation.isNotBlank()) File(truststoreLocation).let { if (it.exists()) it.length() else -1 } else -1
        result["passwordSet"] = keystorePassword.isNotBlank()
        result["topic"] = topicMottattQ1

        try {
            val props = Properties().apply {
                put(BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
                put(GROUP_ID_CONFIG, "eux-portal-core-diag")
                put(AUTO_OFFSET_RESET_CONFIG, "latest")
                put(KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
                put(VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java.name)
                put(ENABLE_AUTO_COMMIT_CONFIG, "false")
                put(SECURITY_PROTOCOL_CONFIG, securityProtocol)
                if (keystoreLocation.isNotBlank()) {
                    put(SSL_KEYSTORE_TYPE_CONFIG, keystoreType)
                    put(SSL_KEYSTORE_LOCATION_CONFIG, keystoreLocation)
                    put(SSL_KEYSTORE_PASSWORD_CONFIG, keystorePassword)
                    put(SSL_TRUSTSTORE_TYPE_CONFIG, truststoreType)
                    put(SSL_TRUSTSTORE_LOCATION_CONFIG, truststoreLocation)
                    put(SSL_TRUSTSTORE_PASSWORD_CONFIG, truststorePassword)
                }
            }

            log.info { "Forsøker å opprette KafkaConsumer..." }
            val consumer = KafkaConsumer<String, String>(props)
            result["consumerCreated"] = true

            consumer.subscribe(listOf(topicMottattQ1))
            result["subscribed"] = true

            val records = consumer.poll(Duration.ofSeconds(5))
            result["pollSuccess"] = true
            result["recordCount"] = records.count()

            consumer.close(Duration.ofSeconds(5))
            result["status"] = "OK"
        } catch (e: Exception) {
            result["status"] = "ERROR"
            result["error"] = e.message
            result["errorClass"] = e.javaClass.name
            result["cause"] = e.cause?.message
            result["causeClass"] = e.cause?.javaClass?.name
            log.error(e) { "Kafka diagnostics feilet" }
        }

        return result
    }
}
