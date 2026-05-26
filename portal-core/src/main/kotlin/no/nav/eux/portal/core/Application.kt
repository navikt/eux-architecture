package no.nav.eux.portal.core

import no.nav.eux.portal.core.kafka.config.KafkaSslProperties
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(KafkaSslProperties::class)
class Application

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
