package no.nav.eux.portal.core.kafka.config

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.config.KafkaListenerContainerFactory
import org.springframework.kafka.core.ConsumerFactory
import org.springframework.kafka.listener.DefaultErrorHandler
import org.springframework.util.backoff.FixedBackOff
import java.time.Duration.ofSeconds

@Configuration
class KafkaConfig {

    val log = logger {}

    @Bean
    fun kafkaListenerContainerFactory(
        consumerFactory: ConsumerFactory<String, String>,
    ): KafkaListenerContainerFactory<*> {
        val factory = ConcurrentKafkaListenerContainerFactory<String, String>()
        factory.setConsumerFactory(consumerFactory)
        factory.containerProperties.setAuthExceptionRetryInterval(ofSeconds(10))
        factory.setCommonErrorHandler(
            DefaultErrorHandler(FixedBackOff(5000L, 3L))
        )
        return factory
    }
}
