package no.nav.eux.portal.core.kafka

object TopicMetadata {

    const val ENV_Q1 = "q1"
    const val ENV_Q2 = "q2"
    const val DIRECTION_MOTTATT = "mottatt"
    const val DIRECTION_SENDT = "sendt"
    const val UNKNOWN = "unknown"

    data class Parsed(val environment: String, val direction: String)

    fun parse(topic: String): Parsed {
        val environment = when {
            topic.endsWith("-$ENV_Q1") -> ENV_Q1
            topic.endsWith("-$ENV_Q2") -> ENV_Q2
            else -> UNKNOWN
        }
        val direction = when {
            topic.contains("sedmottatt") -> DIRECTION_MOTTATT
            topic.contains("sedsendt") -> DIRECTION_SENDT
            else -> UNKNOWN
        }
        return Parsed(environment, direction)
    }
}
