package no.nav.eux.portal.core.navrinasak.store

import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSed
import no.nav.eux.portal.core.navrinasak.model.NavRinasakSedRecord
import no.nav.eux.portal.core.navrinasak.model.SentStatus
import org.junit.jupiter.api.Test
import java.time.Instant

class NavRinasakSedStoreTest {

    private fun sed(
        rinasakId: Int,
        sedId: String?,
        sedVersjon: Int? = sedId?.let { 1 },
        sedType: String? = null,
    ) = NavRinasakSed(
        rinasakId = rinasakId,
        overstyrtEnhetsnummer = null,
        sedId = sedId,
        sedVersjon = sedVersjon,
        sedType = sedType,
        dokumentInfoId = null,
        opprettetBruker = null,
        opprettetTidspunkt = null,
        navRinasakOpprettetBruker = null,
        navRinasakOpprettetTidspunkt = null,
        fagsak = null,
        initiellFagsak = null,
    )

    private fun record(
        sed: NavRinasakSed,
        environment: String = "q1",
        sentStatus: SentStatus = SentStatus.IKKE_SENDT,
    ) = NavRinasakSedRecord(
        sed = sed,
        environment = environment,
        receivedAt = Instant.EPOCH,
        sentStatus = sentStatus,
    )

    @Test
    fun `addIfNew is idempotent on the dedup key`() {
        val store = NavRinasakSedStore()
        store.addIfNew(record(sed(1, "s1"))) shouldBe true
        store.addIfNew(record(sed(1, "s1"))) shouldBe false
        store.getAll().size shouldBe 1
    }

    @Test
    fun `real SED and its placeholder coexist until the placeholder is removed`() {
        val store = NavRinasakSedStore()
        store.addIfNew(record(sed(2, null)))
        store.addIfNew(record(sed(2, "real")))
        store.getAll().size shouldBe 2

        store.removePlaceholderFor("q1", 2) shouldBe true
        store.getAll().none { it.sed.rinasakId == 2 && it.sed.sedId == null } shouldBe true
        store.getAll().any { it.sed.rinasakId == 2 && it.sed.sedId == "real" } shouldBe true
    }

    @Test
    fun `removePlaceholderFor returns false when there is no placeholder`() {
        val store = NavRinasakSedStore()
        store.addIfNew(record(sed(3, "real")))
        store.removePlaceholderFor("q1", 3) shouldBe false
    }

    @Test
    fun `enrichPlaceholder fills only blank fields and is a no-op once filled`() {
        val store = NavRinasakSedStore()
        store.addIfNew(record(sed(4, null)))

        val updated = store.enrichPlaceholder(
            environment = "q1",
            rinasakId = 4,
            sedType = "H001",
            bucType = "H_BUC_01",
            opprettetBruker = "Ola",
            opprettetTidspunkt = "2026-01-01T00:00:00Z",
        )
        updated.shouldNotBeNull()
        updated.sed.sedType shouldBe "H001"
        updated.sed.bucType shouldBe "H_BUC_01"

        store.enrichPlaceholder(
            environment = "q1",
            rinasakId = 4,
            sedType = "H001",
            bucType = "H_BUC_01",
            opprettetBruker = "Ola",
            opprettetTidspunkt = "2026-01-01T00:00:00Z",
        ).shouldBeNull()
    }

    @Test
    fun `enrichPlaceholder returns null for an unknown case`() {
        val store = NavRinasakSedStore()
        store.enrichPlaceholder("q1", 999, "X001", null, null, null).shouldBeNull()
    }

    @Test
    fun `getFiltered narrows by environment and sent status`() {
        val store = NavRinasakSedStore()
        store.addIfNew(record(sed(10, "a"), environment = "q1", sentStatus = SentStatus.IKKE_SENDT))
        store.addIfNew(record(sed(11, "b"), environment = "q2", sentStatus = SentStatus.SENDT))

        store.getFiltered(environment = "q1", onlyNotSent = false).map { it.sed.rinasakId } shouldBe listOf(10)
        store.getFiltered(environment = null, onlyNotSent = true).map { it.sed.rinasakId } shouldBe listOf(10)
    }
}
