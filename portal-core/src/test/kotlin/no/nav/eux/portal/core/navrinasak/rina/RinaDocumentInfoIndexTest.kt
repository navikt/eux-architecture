package no.nav.eux.portal.core.navrinasak.rina

import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

class RinaDocumentInfoIndexTest {

    private fun event(
        type: String?,
        caseId: String? = "123",
        buc: String? = "H_BUC_01",
        firstDocument: Boolean = false,
        creator: String? = "Ola Nordmann",
        creationDate: String? = null,
    ) = RinaDocumentEvent(
        buc = buc,
        payLoad = RinaDocumentEvent.PayLoad(
            documentMetadata = RinaDocumentEvent.DocumentMetadata(
                type = type,
                caseId = caseId,
                isFirstDocument = firstDocument,
                creationDate = creationDate,
                creator = RinaDocumentEvent.Creator(name = creator),
            ),
        ),
    )

    @Test
    fun `records a document and exposes it by case id`() {
        val index = RinaDocumentInfoIndex()
        val info = index.record("q1", event(type = "H001", firstDocument = true))
        info.shouldNotBeNull()
        info.sedType shouldBe "H001"
        info.bucType shouldBe "H_BUC_01"
        info.creator shouldBe "Ola Nordmann"
        info.fromStarter shouldBe true
        index.get("q1", 123)?.sedType shouldBe "H001"
    }

    @Test
    fun `a starter type is not overwritten by a later non-starter`() {
        val index = RinaDocumentInfoIndex()
        index.record("q1", event(type = "H001", firstDocument = true))
        index.record("q1", event(type = "X001", firstDocument = false)).shouldBeNull()
        index.get("q1", 123)?.sedType shouldBe "H001"
    }

    @Test
    fun `a starter replaces an earlier non-starter type`() {
        val index = RinaDocumentInfoIndex()
        index.record("q1", event(type = "X001", firstDocument = false))
        index.record("q1", event(type = "H001", firstDocument = true)).shouldNotBeNull()
        index.get("q1", 123)?.sedType shouldBe "H001"
    }

    @Test
    fun `an unchanged event does not re-broadcast`() {
        val index = RinaDocumentInfoIndex()
        index.record("q1", event(type = "H001", firstDocument = true))
        index.record("q1", event(type = "H001", firstDocument = true)).shouldBeNull()
    }

    @Test
    fun `blank type or case id is ignored`() {
        val index = RinaDocumentInfoIndex()
        index.record("q1", event(type = null)).shouldBeNull()
        index.record("q1", event(type = "")).shouldBeNull()
        index.record("q1", event(type = "H001", caseId = "")).shouldBeNull()
    }

    @Test
    fun `normalizes an hour-only timezone offset to a canonical UTC instant`() {
        val index = RinaDocumentInfoIndex()
        val info = index.record(
            "q1",
            event(type = "H001", firstDocument = true, creationDate = "2026-07-07T16:31:03+02"),
        )
        info.shouldNotBeNull()
        info.creationDate shouldBe "2026-07-07T14:31:03Z"
    }

    @Test
    fun `keeps environments separate`() {
        val index = RinaDocumentInfoIndex()
        index.record("q1", event(type = "H001", firstDocument = true))
        index.get("q2", 123).shouldBeNull()
    }
}
