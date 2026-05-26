package no.nav.eux.portal.core.kafka.config

import org.apache.kafka.clients.consumer.ConsumerConfig.AUTO_OFFSET_RESET_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG
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
    private val propsBuilder: KafkaConsumerPropsBuilder,
) {

    @Bean
    fun sedHendelseConsumerFactory(): ConsumerFactory<String, String> {
        val props = propsBuilder.build(
            bootstrapServers = bootstrapServers,
            securityProtocol = securityProtocol,
            extra = mapOf(
                AUTO_OFFSET_RESET_CONFIG to "latest",
                ENABLE_AUTO_COMMIT_CONFIG to true,
            ),
        )
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
