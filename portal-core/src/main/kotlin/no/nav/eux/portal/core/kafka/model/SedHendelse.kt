package no.nav.eux.portal.core.kafka.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class SedHendelse(
    val id: String? = null,
    val sedId: String? = null,
    val sektorKode: String? = null,
    val bucType: String? = null,
    val rinaSakId: String? = null,
    val avsenderId: String? = null,
    val avsenderNavn: String? = null,
    val avsenderLand: String? = null,
    val mottakerId: String? = null,
    val mottakerNavn: String? = null,
    val mottakerLand: String? = null,
    val rinaDokumentId: String? = null,
    val rinaDokumentVersjon: String? = null,
    val sedType: String? = null,
    val navBruker: String? = null,
)
