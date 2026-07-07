package no.nav.eux.portal.core.navrinasak.store

import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * In-memory, bounded, newest-first store of the SEDs created in nEESSI that
 * portal-core has observed via polling. Deduplicated on environment + sedId +
 * sedVersjon so repeated polls of the same SED are idempotent.
 */
@Component
class NavRinasakSedStore {

    private val buffer = ConcurrentLinkedDeque<NavRinasakSedRecord>()
    private val keys = ConcurrentHashMap.newKeySet<String>()
    private val maxSize = 1000

    private fun keyOf(record: NavRinasakSedRecord) =
        "${record.environment}|${record.sed.sedId}|${record.sed.sedVersjon}"

    /** Adds the record if not already present. Returns true when newly added. */
    fun addIfNew(record: NavRinasakSedRecord): Boolean {
        val key = keyOf(record)
        if (!keys.add(key)) return false
        buffer.addFirst(record)
        while (buffer.size > maxSize) {
            buffer.pollLast()?.let { keys.remove(keyOf(it)) }
        }
        return true
    }

    fun getAll(): List<NavRinasakSedRecord> = buffer.toList()

    fun getFiltered(environment: String?, onlyNotSent: Boolean): List<NavRinasakSedRecord> =
        getAll().filter { record ->
            (environment == null || record.environment == environment) &&
                (!onlyNotSent || record.sentStatus != no.nav.eux.portal.core.navrinasak.model.SentStatus.SENDT)
        }
}
