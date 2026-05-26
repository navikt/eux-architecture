package no.nav.eux.portal.core.kafka.model

import java.time.Instant

data class SedHendelseRecord(
    val hendelse: SedHendelse,
    val topic: String,
    val environment: String,
    val direction: String,
    val receivedAt: Instant,
    val offset: Long,
    val partition: Int,
)
