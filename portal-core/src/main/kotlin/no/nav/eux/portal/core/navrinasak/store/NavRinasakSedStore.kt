package no.nav.eux.portal.core.navrinasak.store

import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * In-memory, bounded, newest-first store of the SEDs created in nEESSI that
 * portal-core has observed via polling. Deduplicated on environment + rinasakId
 * + sedId + sedVersjon so repeated polls of the same SED are idempotent.
 *
 * A case with no journalført dokument yet is held as a single placeholder row
 * (null sedId). When its real SED (dokument) later appears, the poller adds the
 * real row and calls [removePlaceholderFor] to drop the placeholder.
 */
@Component
class NavRinasakSedStore {

    private val buffer = ConcurrentLinkedDeque<NavRinasakSedRecord>()
    private val keys = ConcurrentHashMap.newKeySet<String>()
    private val maxSize = 1000

    private fun keyOf(record: NavRinasakSedRecord) =
        "${record.environment}|${record.sed.rinasakId}|${record.sed.sedId ?: "∅"}|${record.sed.sedVersjon ?: "∅"}"

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

    /**
     * Removes the placeholder row (null sedId) for a case, if present. Called
     * once the case's first real SED (dokument) is observed, so the case is not
     * shown as both "no SED yet" and its real SED. Returns true if one was removed.
     */
    fun removePlaceholderFor(environment: String, rinasakId: Int): Boolean {
        var removed = false
        val iterator = buffer.iterator()
        while (iterator.hasNext()) {
            val record = iterator.next()
            if (record.environment == environment &&
                record.sed.rinasakId == rinasakId &&
                record.sed.sedId == null
            ) {
                iterator.remove()
                keys.remove(keyOf(record))
                removed = true
            }
        }
        return removed
    }

    /**
     * Enriches a case's placeholder row (null sedId) in place with details learned
     * from the RINA document-events stream (SED type / BUC / creator) before the
     * SED is journalført. Only fills fields that are still blank so a later real
     * SED is never overwritten. Returns the updated record when something changed,
     * else null.
     */
    fun enrichPlaceholder(
        environment: String,
        rinasakId: Int,
        sedType: String?,
        bucType: String?,
        opprettetBruker: String?,
        opprettetTidspunkt: String?,
    ): NavRinasakSedRecord? {
        val record = buffer.firstOrNull {
            it.environment == environment && it.sed.rinasakId == rinasakId && it.sed.sedId == null
        } ?: return null
        val current = record.sed
        val enriched = current.copy(
            sedType = current.sedType ?: sedType,
            bucType = current.bucType ?: bucType,
            opprettetBruker = current.opprettetBruker ?: opprettetBruker,
            opprettetTidspunkt = current.opprettetTidspunkt ?: opprettetTidspunkt,
        )
        if (enriched == current) return null
        record.sed = enriched
        return record
    }

    fun getAll(): List<NavRinasakSedRecord> = buffer.toList()

    fun getFiltered(environment: String?, onlyNotSent: Boolean): List<NavRinasakSedRecord> =
        getAll().filter { record ->
            (environment == null || record.environment == environment) &&
                (!onlyNotSent || record.sentStatus != no.nav.eux.portal.core.navrinasak.model.SentStatus.SENDT)
        }
}
