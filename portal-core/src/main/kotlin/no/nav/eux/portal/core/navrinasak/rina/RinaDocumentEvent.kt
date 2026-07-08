package no.nav.eux.portal.core.navrinasak.rina

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/**
 * The subset of a RINA document event (`eux-rina-document-events-v1`) that the
 * portal needs to know the SED type of a case *before* the SED is journalført in
 * eux-nav-rinasak. Only metadata is mapped — the full `SED_DATA` payload (which
 * carries personal data) is deliberately **not** deserialized/retained, so the
 * portal ingests only what it displays (SED type, BUC, case id, creator).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class RinaDocumentEvent(
    val documentEventType: String? = null,
    val buc: String? = null,
    @param:JsonProperty("payLoad")
    val payLoad: PayLoad? = null,
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class PayLoad(
        @param:JsonProperty("DOCUMENT_METADATA")
        val documentMetadata: DocumentMetadata? = null,
    )

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class DocumentMetadata(
        val id: String? = null,
        val type: String? = null,
        val caseId: String? = null,
        val direction: String? = null,
        val status: String? = null,
        val isSendExecuted: Boolean? = null,
        val isFirstDocument: Boolean? = null,
        val starter: Boolean? = null,
        val creationDate: String? = null,
        val creator: Creator? = null,
    )

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class Creator(
        val name: String? = null,
    )

    val metadata: DocumentMetadata? get() = payLoad?.documentMetadata

    /** True when this event describes the BUC's starter/first SED (e.g. H001 in H_BUC_01). */
    val isStarter: Boolean
        get() = metadata?.isFirstDocument == true || metadata?.starter == true
}
