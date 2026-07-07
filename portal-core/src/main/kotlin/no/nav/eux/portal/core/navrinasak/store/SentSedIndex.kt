package no.nav.eux.portal.core.navrinasak.store

import org.springframework.stereotype.Component
import java.util.Collections

/**
 * Bounded, in-memory index of SEDs known to have been *sent*, derived from the
 * `sedsendt` Kafka events portal-core already consumes. Used to flip the
 * Sendt/Ikke sendt status of created SEDs.
 *
 * Match is best-effort: primary key is (env, rinaSakId, sedId); a coarser
 * (env, rinaSakId, sedType) fallback catches cases where the sedId does not line
 * up between eux-nav-rinasak and the Kafka event.
 */
@Component
class SentSedIndex {

    private val sentBySedId = boundedSet(MAX)
    private val sentByType = boundedSet(MAX)

    fun markSent(environment: String, rinaSakId: String?, sedIds: Collection<String?>, sedType: String?) {
        if (rinaSakId.isNullOrBlank()) return
        sedIds.filterNot { it.isNullOrBlank() }
            .forEach { sentBySedId.add("$environment|$rinaSakId|$it") }
        if (!sedType.isNullOrBlank()) sentByType.add("$environment|$rinaSakId|$sedType")
    }

    fun isSent(environment: String, rinaSakId: Int, sedId: String?, sedType: String?): Boolean {
        if (!sedId.isNullOrBlank() && sentBySedId.contains("$environment|$rinaSakId|$sedId")) return true
        if (!sedType.isNullOrBlank() && sentByType.contains("$environment|$rinaSakId|$sedType")) return true
        return false
    }

    private companion object {
        const val MAX = 10_000

        fun boundedSet(max: Int): MutableSet<String> =
            Collections.synchronizedSet(
                Collections.newSetFromMap(
                    object : LinkedHashMap<String, Boolean>(16, 0.75f, false) {
                        override fun removeEldestEntry(eldest: Map.Entry<String, Boolean>?) = size > max
                    },
                ),
            )
    }
}
