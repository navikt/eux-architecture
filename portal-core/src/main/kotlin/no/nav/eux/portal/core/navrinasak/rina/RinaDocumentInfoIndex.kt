package no.nav.eux.portal.core.navrinasak.rina

import io.github.oshai.kotlinlogging.KotlinLogging.logger
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import java.util.Collections

/**
 * Bounded, in-memory index of the SED type of a RINA case, derived from
 * `eux-rina-document-events-v1`. Lets the portal show the SED type (e.g. H001)
 * of a case that has been created in nEESSI but whose dokument is not journalført
 * in eux-nav-rinasak yet, keyed by (environment, rinaSakId).
 *
 * The starter/first document of a BUC (e.g. H001 in H_BUC_01) wins, since that is
 * the SED the case is about; other documents only fill in if no starter is known.
 */
@Component
class RinaDocumentInfoIndex {

    private val log = logger {}

    data class DocInfo(
        val sedType: String?,
        val bucType: String?,
        val creator: String?,
        val creationDate: String?,
        val fromStarter: Boolean,
    )

    private val byCase = Collections.synchronizedMap(
        object : LinkedHashMap<String, DocInfo>(16, 0.75f, false) {
            override fun removeEldestEntry(eldest: Map.Entry<String, DocInfo>?) = size > MAX
        },
    )

    private fun key(environment: String, rinaSakId: String) = "$environment|$rinaSakId"

    /**
     * Records the SED type of a case from a document event. Returns the resulting
     * [DocInfo] when it was created or changed, or null when the event added
     * nothing new (so callers can skip re-broadcasting).
     */
    fun record(environment: String, event: RinaDocumentEvent): DocInfo? {
        val meta = event.metadata ?: return null
        val caseId = meta.caseId?.takeIf { it.isNotBlank() } ?: return null
        val sedType = meta.type?.takeIf { it.isNotBlank() } ?: return null
        val k = key(environment, caseId)
        val incoming = DocInfo(
            sedType = sedType,
            bucType = event.buc?.takeIf { it.isNotBlank() },
            creator = meta.creator?.name?.takeIf { it.isNotBlank() },
            creationDate = normalizeInstant(meta.creationDate),
            fromStarter = event.isStarter,
        )
        synchronized(byCase) {
            val existing = byCase[k]
            // Keep an existing starter-derived type unless the incoming one is also a starter.
            if (existing != null && existing.fromStarter && !incoming.fromStarter) return null
            if (existing == incoming) return null
            byCase[k] = incoming
            return incoming
        }
    }

    fun get(environment: String, rinaSakId: Int): DocInfo? = byCase[key(environment, rinaSakId.toString())]

    /**
     * Normalizes a RINA `creationDate` to a canonical UTC ISO-8601 instant
     * (e.g. `2026-07-07T14:31:03Z`). RINA emits offsets with hours only
     * (`2026-07-07T16:31:03+02`), which `java.time` parses fine but JavaScript's
     * `Date` cannot — so we canonicalize server-side to keep the API's timestamps
     * uniformly JS-parseable. Returns null when the value is blank/unparseable.
     */
    private fun normalizeInstant(raw: String?): String? {
        val value = raw?.takeIf { it.isNotBlank() } ?: return null
        return try {
            OffsetDateTime.parse(value).toInstant().toString()
        } catch (_: DateTimeParseException) {
            try {
                Instant.parse(value).toString()
            } catch (_: DateTimeParseException) {
                log.debug { "Kunne ikke tolke RINA creationDate=$value" }
                null
            }
        }
    }

    private companion object {
        const val MAX = 20_000
    }
}
