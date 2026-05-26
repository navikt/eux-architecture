package no.nav.eux.portal.core.kafka.store

import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentLinkedDeque

@Component
class SedHendelseStore {

    private val buffer = ConcurrentLinkedDeque<SedHendelseRecord>()
    private val maxSize = 500

    fun add(record: SedHendelseRecord) {
        buffer.addFirst(record)
        while (buffer.size > maxSize) {
            buffer.removeLast()
        }
    }

    fun getAll(): List<SedHendelseRecord> = buffer.toList()

    fun getFiltered(environment: String?, direction: String?): List<SedHendelseRecord> =
        getAll().filter { record ->
            (environment == null || record.environment == environment) &&
                (direction == null || record.direction == direction)
        }
}
