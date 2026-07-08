package no.nav.eux.portal.core.navrinasak.rina

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import no.nav.eux.portal.core.kafka.TopicMetadata
import no.nav.eux.portal.core.navrinasak.sse.NavRinasakSseRegistry
import no.nav.eux.portal.core.navrinasak.store.NavRinasakSedStore
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper

/**
 * Live consumer of `eux-rina-document-events-v1-q1/q2`. RINA emits a document
 * event the moment a SED is created in a case (including the BUC's starter SED),
 * long before the SED is journalført into eux-nav-rinasak. We use only the
 * document *metadata* (SED type, BUC, creator) to enrich the case placeholder
 * rows shown by the "SED-er i nEESSI" page so they display e.g. `H001` instead of
 * "SED ikke journalført".
 */
@Service
@ConditionalOnProperty(name = ["portal.kafka.enabled"], havingValue = "true")
class RinaDocumentEventConsumer(
    private val objectMapper: ObjectMapper,
    private val documentInfoIndex: RinaDocumentInfoIndex,
    private val store: NavRinasakSedStore,
    private val sseRegistry: NavRinasakSseRegistry,
) {

    private val log = logger {}

    @KafkaListener(
        id = "eux-portal-core-rina-document-events",
        topics = [
            "\${kafka.topics.rina-document-events-v1-q1}",
            "\${kafka.topics.rina-document-events-v1-q2}",
        ],
        containerFactory = "sedHendelseKafkaListenerContainerFactory",
    )
    fun onDocumentEvent(record: ConsumerRecord<String, String>) {
        try {
            val event = objectMapper.readValue(record.value(), RinaDocumentEvent::class.java)
            val environment = TopicMetadata.parse(record.topic()).environment
            val info = documentInfoIndex.record(environment, event) ?: return
            val caseId = event.metadata?.caseId?.toIntOrNull() ?: return
            val updated = store.enrichPlaceholder(
                environment = environment,
                rinasakId = caseId,
                sedType = info.sedType,
                bucType = info.bucType,
                opprettetBruker = info.creator,
                opprettetTidspunkt = info.creationDate,
            )
            if (updated != null) {
                sseRegistry.broadcast("nav-rinasak-sed", updated)
                log.debug { "Beriket nav-rinasak $environment rinasakId=$caseId med SED-type ${info.sedType}" }
            }
        } catch (e: Exception) {
            log.warn(e) { "Feil ved prosessering av RINA document-event fra ${record.topic()} offset=${record.offset()}" }
        }
    }
}
