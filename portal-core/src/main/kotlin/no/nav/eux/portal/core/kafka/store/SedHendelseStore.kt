package no.nav.eux.portal.core.kafka.store

import no.nav.eux.portal.core.kafka.model.SedHendelseRecord
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * In-memory, bounded, newest-first buffer of SED events. Deduplicated on
 * topic + partition + offset, since the startup backfill and the live listener
 * (resuming from its committed offset) can both deliver the same message.
 */
@Component
class SedHendelseStore {

    private val buffer = ConcurrentLinkedDeque<SedHendelseRecord>()
    private val keys = ConcurrentHashMap.newKeySet<String>()
    private val maxSize = 500

    private fun keyOf(record: SedHendelseRecord) = "${record.topic}|${record.partition}|${record.offset}"

    /** Adds the record if not already present. Returns true when newly added. */
    fun add(record: SedHendelseRecord): Boolean {
        if (!keys.add(keyOf(record))) return false
        buffer.addFirst(record)
        while (buffer.size > maxSize) {
            buffer.pollLast()?.let { keys.remove(keyOf(it)) }
        }
        return true
    }

    fun getAll(): List<SedHendelseRecord> = buffer.toList()

    fun getFiltered(environment: String?, direction: String?): List<SedHendelseRecord> =
        getAll().filter { record ->
            (environment == null || record.environment == environment) &&
                (direction == null || record.direction == direction)
        }
}
