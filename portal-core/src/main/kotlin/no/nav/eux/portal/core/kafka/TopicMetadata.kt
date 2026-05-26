package no.nav.eux.portal.core.kafka

object TopicMetadata {

    data class Parsed(val environment: String, val direction: String)

    fun parse(topic: String): Parsed {
        val environment = when {
            topic.endsWith("-q1") -> "q1"
            topic.endsWith("-q2") -> "q2"
            else -> "unknown"
        }
        val direction = when {
            topic.contains("sedmottatt") -> "mottatt"
            topic.contains("sedsendt") -> "sendt"
            else -> "unknown"
        }
        return Parsed(environment, direction)
    }
}
