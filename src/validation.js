const MAX_DESCRIPTION_LENGTH = 300

function normalizeDescription(description) {
	return description === undefined || description === null ? '' : String(description)
}

function validateDescription(description) {
	if (normalizeDescription(description).length > MAX_DESCRIPTION_LENGTH) {
		return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
	}
	return null
}

module.exports = { MAX_DESCRIPTION_LENGTH, normalizeDescription, validateDescription }
